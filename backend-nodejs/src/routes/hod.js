const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { User, Subject, CIEMark, Student } = require('../models');
const { Op } = require('sequelize');

// HOD dashboard
router.get('/dashboard', authMiddleware, roleMiddleware('HOD'), (req, res) => {
    res.json({
        message: 'HOD dashboard',
        user: req.user
    });
});

// HOD Overview - Real data for overview tab
router.get('/overview', authMiddleware, roleMiddleware('HOD', 'PRINCIPAL'), async (req, res) => {
    try {
        const { department } = req.query;
        const dept = department || 'CS';

        // 1. Get all marks for this department with student + subject info
        const marks = await CIEMark.findAll({
            include: [
                { model: Subject, as: 'subject', where: { department: dept } },
                { model: Student, as: 'student' }
            ]
        });

        // 2. Compute Grade Distribution from marks
        let gradeA = 0, gradeB = 0, gradeC = 0, gradeD = 0, gradeF = 0;
        marks.forEach(m => {
            const score = m.marks || 0;
            const maxMarks = m.maxMarks || 50;
            const percent = (score / maxMarks) * 100;
            if (percent >= 80) gradeA++;
            else if (percent >= 60) gradeB++;
            else if (percent >= 40) gradeC++;
            else if (percent >= 20) gradeD++;
            else gradeF++;
        });

        const gradeDistribution = {
            labels: ['A (80%+)', 'B (60-79%)', 'C (40-59%)', 'D (20-39%)', 'F (<20%)'],
            data: [gradeA, gradeB, gradeC, gradeD, gradeF]
        };

        // 3. Generate real alerts from data
        const alerts = [];
        let alertId = 1;

        // Find students with very low marks (at-risk)
        const studentMarksMap = {};
        marks.forEach(m => {
            const key = m.studentId;
            if (!studentMarksMap[key]) {
                studentMarksMap[key] = { student: m.student, scores: [], subjects: new Set() };
            }
            studentMarksMap[key].scores.push(m.marks || 0);
            if (m.subject) studentMarksMap[key].subjects.add(m.subject.name);
        });

        let atRiskCount = 0;
        Object.values(studentMarksMap).forEach(entry => {
            const avg = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
            if (avg < 18 && entry.student) {
                atRiskCount++;
                if (alerts.length < 5) {
                    alerts.push({
                        id: alertId++,
                        type: 'warning',
                        message: `${entry.student.name} has low average (${avg.toFixed(1)}/50)`,
                        date: new Date().toLocaleDateString()
                    });
                }
            }
        });

        if (atRiskCount > 5) {
            alerts.unshift({
                id: alertId++,
                type: 'critical',
                message: `${atRiskCount} students are at risk with below-threshold marks`,
                date: new Date().toLocaleDateString()
            });
        }

        // Check for subjects with poor overall performance
        const subjectPerf = {};
        marks.forEach(m => {
            if (!m.subject) return;
            const name = m.subject.name;
            if (!subjectPerf[name]) subjectPerf[name] = { total: 0, count: 0 };
            subjectPerf[name].total += (m.marks || 0);
            subjectPerf[name].count++;
        });

        Object.entries(subjectPerf).forEach(([name, data]) => {
            const avg = data.total / data.count;
            if (avg < 25) {
                alerts.push({
                    id: alertId++,
                    type: 'warning',
                    message: `${name} has low class average (${avg.toFixed(1)}/50)`,
                    date: new Date().toLocaleDateString()
                });
            }
        });

        // Pending submissions alert
        const pendingCount = marks.filter(m => m.status === 'PENDING').length;
        if (pendingCount > 0) {
            alerts.push({
                id: alertId++,
                type: 'info',
                message: `${pendingCount} mark entries are still pending review`,
                date: new Date().toLocaleDateString()
            });
        }

        // If no alerts, add a positive one
        if (alerts.length === 0) {
            alerts.push({
                id: 1,
                type: 'info',
                message: 'All department metrics are within acceptable range',
                date: new Date().toLocaleDateString()
            });
        }

        // 4. Faculty count
        const facultyCount = await User.count({ where: { role: 'FACULTY', department: dept } });

        res.json({
            gradeDistribution,
            alerts,
            facultyCount
        });

    } catch (error) {
        console.error('HOD overview error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Faculty List (with optional department filter)
router.get('/faculty', authMiddleware, roleMiddleware('HOD', 'PRINCIPAL'), async (req, res) => {
    try {
        const { department } = req.query;
        const whereClause = { role: 'FACULTY' };
        if (department) {
            whereClause.department = department;
        }

        const faculty = await User.findAll({
            where: whereClause,
            attributes: ['id', 'username', 'fullName', 'email', 'department']
        });

        // Enhance with subjects mapping
        const formatted = await Promise.all(faculty.map(async f => {
            const subjects = await Subject.findAll({ where: { instructorId: f.id } });
            return {
                id: f.id,
                username: f.username,
                fullName: f.fullName || f.username,
                department: f.department || 'General',
                designation: 'Faculty',
                subjects: subjects.map(s => s.name)
            };
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Get faculty error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Add Faculty
router.post('/faculty', authMiddleware, roleMiddleware('HOD'), async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { username, fullName, email, password, department, designation } = req.body;
        const hashedPassword = await bcrypt.hash(password || 'password123', 10);

        const newFaculty = await User.create({
            username,
            fullName,
            email,
            password: hashedPassword,
            role: 'FACULTY',
            department,
            associatedId: username
        });

        res.status(201).json({ message: 'Faculty created successfully', id: newFaculty.id });
    } catch (error) {
        console.error('Add faculty error:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
});

module.exports = router;

