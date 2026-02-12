const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Principal dashboard
const { Student, User, Subject, CIEMark, Announcement } = require('../models');
const { Op } = require('sequelize');

// Principal dashboard
router.get('/dashboard', authMiddleware, roleMiddleware('PRINCIPAL'), async (req, res) => {
    try {
        // Fetch Total Students
        const totalStudents = await Student.count();

        // Fetch Total Faculty (Users with role 'FACULTY' or 'HOD')
        const totalFaculty = await User.count({
            where: {
                role: { [Op.in]: ['FACULTY', 'HOD'] }
            }
        });

        // Fetch Department Count
        const departments = ['CS', 'EC', 'ME', 'CV']; // Static list
        const deptCount = departments.length;

        // Calculate Subject/Branch Performance (Static for now)
        const branchPerformance = [82, 75, 88, 79];

        // Fetch Low Performers (Marks < 20)
        const lowPerformers = await CIEMark.findAll({
            where: { marks: { [Op.lt]: 20 } },
            include: [
                { model: Student, as: 'student', attributes: ['name', 'regNo', 'department', 'semester'] },
                { model: Subject, as: 'subject', attributes: ['name', 'code'] }
            ],
            limit: 10,
            order: [['marks', 'ASC']]
        });

        // Mock Data for specific widgets (to be replaced with real DB tables later)
        const hodSubmissionStatus = [
            { id: 1, dept: 'Computer Science', hod: 'MD Jaffar', status: 'Approved', punctuality: 'On Time', submissionDate: '2025-10-15', delayDays: 0, completion: 100, priority: 'Normal', remarks: 'All CIE marks verified.' },
            { id: 2, dept: 'Mechanical', hod: 'Prof. Ramesh Gouda', status: 'Pending', punctuality: 'Delayed', submissionDate: '-', delayDays: 3, completion: 85, priority: 'High Priority', remarks: '2nd Sem B Sec pending.' },
            { id: 3, dept: 'Electronics', hod: 'Dr. Suresh K', status: 'Submitted', punctuality: 'On Time', submissionDate: '2025-10-16', delayDays: 0, completion: 100, priority: 'Normal', remarks: 'Pending Principal approval.' },
            { id: 4, dept: 'Civil Engineering', hod: 'Prof. Anitha R', status: 'Pending', punctuality: 'On Time', submissionDate: '-', delayDays: 0, completion: 60, priority: 'Normal', remarks: 'Data entry in progress.' }
        ];

        const academicTrends = {
            labels: ['2020', '2021', '2022', '2023', '2024'],
            passRate: [78, 82, 80, 85, 88],
            avgScore: [65, 68, 67, 70, 72]
        };

        const recentActivities = [
            { id: 1, text: "CIE-1 Marks finalized for CS Dept", time: "2 hours ago", type: "success" },
            { id: 2, text: "New Grievance reported by ME Student", time: "5 hours ago", type: "warning" },
            { id: 3, text: "Faculty Meeting scheduled for tomorrow", time: "1 day ago", type: "info" }
        ];

        res.json({
            stats: {
                totalStudents,
                totalFaculty,
                departments: deptCount,
                cieStatus: 'Active',
                passPercentage: 85
            },
            branches: departments,
            branchPerformance: branchPerformance,
            lowPerformers,
            hodSubmissionStatus,
            academicTrends,
            recentActivities,
            insights: {
                lowAttendance: 12,
                pendingApprovals: 5,
                alerts: [
                    { type: 'critical', msg: 'Mechanical Dept: Attendance < 65%' },
                    { type: 'warning', msg: 'Civil Dept: 3 Faculty Evaluations Pending' }
                ]
            },
            message: 'Dashboard data fetched'
        });
    } catch (error) {
        console.error('Error fetching principal dashboard data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Get All Faculty
router.get('/faculty/all', authMiddleware, roleMiddleware('PRINCIPAL'), async (req, res) => {
    try {
        const faculty = await User.findAll({
            where: { role: { [Op.in]: ['FACULTY', 'HOD'] } },
            attributes: ['id', 'username', 'email', 'department', 'role'] // username maps to name usually
        });

        // Map to frontend expectation
        const formattedFaculty = faculty.map((f, index) => ({
            id: f.id,
            name: f.username, // Assuming username is the name
            dept: f.department || 'General',
            designation: f.role === 'HOD' ? 'HOD' : 'Lecturer',
            workload: '18 Hrs/Wk', // Placeholder
            status: 'Active',
            qualifications: 'M.Tech' // Placeholder
        }));

        res.json(formattedFaculty);
    } catch (error) {
        console.error('Error fetching faculty:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Placeholder: Timetables
router.get('/timetables', authMiddleware, roleMiddleware('PRINCIPAL'), (req, res) => {
    res.json([
        { id: 1, dept: 'Computer Science', semester: '2nd Sem', updated: '2 days ago' },
        { id: 2, dept: 'Mechanical', semester: '2nd Sem', updated: '1 week ago' },
        { id: 3, dept: 'Civil Engineering', semester: '2nd Sem', updated: '3 days ago' },
        { id: 4, dept: 'Electronics (EC)', semester: '2nd Sem', updated: '5 days ago' }
    ]);
});

// Placeholder: Circulars
router.get('/circulars', authMiddleware, roleMiddleware('PRINCIPAL'), (req, res) => {
    res.json([
        { id: 1, title: 'CIE-1 Schedule Announced', target: 'All Students', date: 'Oct 10, 2025', status: 'Sent' },
        { id: 2, title: 'Faculty Meeting', target: 'All Faculty', date: 'Oct 12, 2025', status: 'Pending' },
        { id: 3, title: 'Holiday Notice', target: 'Everyone', date: 'Oct 15, 2025', status: 'Scheduled' }
    ]);
});

// Placeholder: Reports
router.get('/reports', authMiddleware, roleMiddleware('PRINCIPAL'), (req, res) => {
    res.json([
        { id: 1, name: 'CIE-1_Analysis_CS.pdf', type: 'PDF', size: '2.4 MB', date: 'Oct 20, 2025' },
        { id: 2, name: 'Attendance_Report_Sept.xlsx', type: 'Excel', size: '1.1 MB', date: 'Oct 05, 2025' },
        { id: 3, name: 'Faculty_Workload_2025.pdf', type: 'PDF', size: '3.5 MB', date: 'Sept 15, 2025' }
    ]);
});

// Placeholder: Grievances
router.get('/grievances', authMiddleware, roleMiddleware('PRINCIPAL'), (req, res) => {
    res.json([
        { id: 'G001', student: 'Rahul Sharma (CS)', issue: 'Marks Discrepancy in Maths', date: '2 days ago', priority: 'High', status: 'Open' },
        { id: 'G002', student: 'Priya P (EC)', issue: 'Attendance Correction', date: '1 week ago', priority: 'Medium', status: 'Resolved' },
        { id: 'G003', student: 'Amit K (ME)', issue: 'Lab Equipment Issue', date: '3 days ago', priority: 'Medium', status: 'In Progress' }
    ]);
});

// Global Search (Principal)
router.get('/search', authMiddleware, roleMiddleware('PRINCIPAL'), async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ students: [], faculty: [] });

        // Search Students
        const students = await Student.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: `%${q}%` } },
                    { regNo: { [Op.like]: `%${q}%` } }
                ]
            },
            limit: 5,
            attributes: ['id', 'name', 'regNo', 'department']
        });

        // Search Faculty (Users)
        const faculty = await User.findAll({
            where: {
                role: { [Op.in]: ['FACULTY', 'HOD'] },
                username: { [Op.like]: `%${q}%` }
            },
            limit: 5,
            attributes: ['id', 'username', 'role', 'department']
        });

        res.json({ students, faculty });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
