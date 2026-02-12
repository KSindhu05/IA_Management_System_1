const express = require('express');
const router = express.Router();
const { Subject, CIEMark, Student } = require('../models');
const { Op } = require('sequelize');
const { authMiddleware } = require('../middleware/auth');

// Get department analytics (per-student basis)
router.get('/department/:dept/stats', authMiddleware, async (req, res) => {
    try {
        const { dept } = req.params;

        // Fetch all marks for the department
        const marks = await CIEMark.findAll({
            include: [{
                model: Subject,
                as: 'subject',
                where: { department: dept }
            }]
        });

        if (marks.length === 0) {
            return res.json({
                average: 0,
                passPercentage: 0,
                atRiskCount: 0,
                totalStudents: 0
            });
        }

        // Aggregate marks by student
        const studentMarks = {};
        marks.forEach(mark => {
            const sid = mark.studentId;
            if (!studentMarks[sid]) {
                studentMarks[sid] = { total: 0, count: 0 };
            }
            studentMarks[sid].total += (mark.marks || 0);
            studentMarks[sid].count++;
        });

        const PASS_THRESHOLD = 20; // Average >= 20/50 is pass
        const RISK_THRESHOLD = 18; // Average < 18/50 is at-risk

        let totalAvg = 0;
        let passedStudents = 0;
        let atRiskStudents = 0;
        const studentIds = Object.keys(studentMarks);
        const totalStudents = studentIds.length;

        studentIds.forEach(sid => {
            const avg = studentMarks[sid].total / studentMarks[sid].count;
            totalAvg += avg;

            if (avg >= PASS_THRESHOLD) {
                passedStudents++;
            }
            if (avg < RISK_THRESHOLD) {
                atRiskStudents++;
            }
        });

        const departmentAverage = totalStudents > 0 ? (totalAvg / totalStudents).toFixed(1) : 0;
        const passPercentage = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : 0;

        res.json({
            average: parseFloat(departmentAverage),
            passPercentage: parseFloat(passPercentage),
            atRiskCount: atRiskStudents,
            totalStudents
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get department performance summary (mock/calculated)
router.get('/department/:dept', authMiddleware, async (req, res) => {
    try {
        const { dept } = req.params;
        // This endpoint seems to be a duplicate or slightly different view of stats.
        // For now, redirecting to stats logic or providing a simple success response
        // to prevent 404 errors until specific requirements are clarified.
        // HODDashboard calls this.

        res.json({
            department: dept,
            status: 'active',
            message: 'Department analytics ready'
        });
    } catch (error) {
        console.error('Department info error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
