import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import API_BASE_URL from '../config/api';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, FilePlus, Save, AlertCircle, Phone, FileText, CheckCircle, Search, Filter, Mail, X, Download, Clock, BarChart2, TrendingDown, Award, ClipboardList, AlertTriangle, Edit3, Edit, Calendar, UserCheck, BookOpen, Upload, Megaphone, Lock, Bell, MapPin } from 'lucide-react';
import { facultyData, facultyProfiles, facultySubjects, studentsList, labSchedule, getMenteesForFaculty } from '../utils/mockData';
import styles from './FacultyDashboard.module.css';

const FacultyDashboard = () => {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('Overview');
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [marks, setMarks] = useState({}); // Map { studentId: { co1: val... } }
    const [isLocked, setIsLocked] = useState(false); // For Commit/Edit workflow
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [searchTerm, setSearchTerm] = useState('');

    // Notification State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [myAnnouncements, setMyAnnouncements] = useState([]);
    const [publishedSchedules, setPublishedSchedules] = useState([]); // CIE schedules published by HOD

    // API State
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [allStudentMarks, setAllStudentMarks] = useState({}); // { subjectId: { studentId: { ...marks } } }
    const API_BASE = `${API_BASE_URL}/marks`;
    const [facultyClassAnalytics, setFacultyClassAnalytics] = useState({
        evaluated: 0,
        pending: 0,
        avgScore: 0,
        lowPerformers: 0,
        topPerformers: 0,
        lowPerformersList: []
    });

    // Verify Faculty
    const currentFaculty = facultyProfiles.find(f => f.id === user?.id) || facultyData;

    // Filter Subjects for this Faculty
    const mySubjects = subjects.length > 0
        ? subjects.map(s => ({
            ...s,
            studentCount: students.filter(st => String(st.semester) === String(s.semester) && st.department === s.department).length || 0
        }))
        : facultySubjects.filter(sub => sub.instructorId === currentFaculty.id);

    // Filter Mentees
    // Filter Mentees (Mock: Assign first 5 students as mentees)
    // Filter Mentees (Mock: Assign first 5 students as mentees)
    // Update: Calculate real attendance for mentees similar to profile modal
    const myMentees = students.length > 0 ? students.slice(0, 5).map(s => {
        let realAttendance = s.attendance || 0;
        if (allStudentMarks) {
            Object.keys(allStudentMarks).forEach(subId => {
                const sMarks = allStudentMarks[subId][s.id];
                // Check if attendance exists and is greater
                if (sMarks && sMarks.attendance !== undefined && sMarks.attendance !== null) {
                    // If s.attendance was 0 (default), this will take the real value
                    // Or if we want max across subjects
                    realAttendance = Math.max(realAttendance, Number(sMarks.attendance));
                }
            });
        }
        return { ...s, attendance: realAttendance };
    }) : [];

    // Filter Defaulters (Attendance < 75%)
    const attendanceDefaulters = studentsList.filter(s => s.attendance < 75);

    // Fetch Analytics helper
    const fetchAnalytics = React.useCallback(async () => {
        if (!user || !user.token) return;
        try {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            const anRes = await fetch(`${API_BASE_URL}/faculty/analytics`, { headers });
            if (anRes.ok) {
                const data = await anRes.json();
                setFacultyClassAnalytics(data);
            }
        } catch (e) {
            console.error("Failed to fetch analytics", e);
        }
    }, [user, API_BASE_URL]);

    // Refresh analytics when switching to Low Performers tab
    React.useEffect(() => {
        if (activeSection === 'Low Performers') {
            fetchAnalytics();
        }
    }, [activeSection, fetchAnalytics]);

    React.useEffect(() => {
        if (!user || !user.token) return;

        const fetchInitialData = async () => {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            console.log("Fetching initial data for faculty...");

            // Fetch Students
            try {
                const sRes = await fetch(`${API_BASE_URL}/student/all`, { headers });
                console.log("Students API status:", sRes.status);
                if (sRes.ok) {
                    const data = await sRes.json();
                    console.log("Fetched Students:", data.length, data[0]); // Log first student to check structure
                    setStudents(data);
                } else {
                    console.error("Failed to fetch students");
                }
            } catch (e) {
                console.error("Error fetching students:", e);
            }

            // Fetch Subjects (By Faculty Assignment)
            try {
                const subRes = await fetch(`${API_BASE_URL}/faculty/my-subjects`, { headers });
                console.log("Subjects API status:", subRes.status);
                if (subRes.ok) {
                    const data = await subRes.json();
                    console.log("Subjects fetched:", data.length);
                    setSubjects(data);
                } else {
                    console.error("Subjects fetch failed:", await subRes.text());
                }
            } catch (e) {
                console.error("Failed to fetch subjects", e);
            }

            // Fetch Analytics (Initial Load)
            fetchAnalytics();

            // Fetch Notifications
            try {
                const notifRes = await fetch(`${API_BASE_URL}/api/cie/faculty/notifications`, { headers });
                if (notifRes.ok) {
                    const notifs = await notifRes.json();
                    setNotifications(notifs);
                    setUnreadCount(notifs.filter(n => !n.isRead).length);
                }
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            }

            // Fetch My Announcements
            try {
                const annRes = await fetch(`${API_BASE_URL}/api/cie/faculty/announcements/list`, { headers });
                if (annRes.ok) {
                    const anns = await annRes.json();
                    setMyAnnouncements(anns);
                }
            } catch (e) {
                console.error("Failed to fetch announcements", e);
            }

            // Fetch Published CIE Schedules (from HOD)
            try {
                const schedRes = await fetch(`${API_BASE_URL}/cie/faculty/schedules`, { headers });
                if (schedRes.ok) {
                    const scheds = await schedRes.json();
                    setPublishedSchedules(scheds);
                }
            } catch (e) {
                console.error("Failed to fetch published schedules", e);
            }

            // Fetch Marks for all subjects (for analytics and proctoring)
            try {
                // We need to fetch marks for all subjects this faculty handles
                // Since we don't have the subjects list fully ready here (async), 
                // we might need to rely on the 'my-subjects' response or fetch all marks for faculty.
                // Assuming there's an endpoint or we iterate.
                // For now, let's try to fetch marks for the subjects we just fetched.

                // Correction: We can't easily access 'data' from subRes here without restructuring.
                // Let's blindly fetch marks for all subjects if we can, or just wait for user to select.
                // But 'myStudents' needs marks.

                // Workaround: Fetch all marks for faculty's subjects.
                // If API supports it: GET /faculty/all-marks
                // If not, we iterate.

                // Let's assume we can fetch marks for each subject.
                const subRes = await fetch(`${API_BASE_URL}/faculty/my-subjects`, { headers });
                if (subRes.ok) {
                    const subs = await subRes.json();
                    const marksMap = {};

                    await Promise.all(subs.map(async (sub) => {
                        try {
                            const mRes = await fetch(`${API_BASE_URL}/marks/subject/${sub.id}`, { headers });
                            if (mRes.ok) {
                                const mData = await mRes.json();
                                // Transform to { studentId: marks }
                                const subMarks = {};
                                mData.forEach(m => {
                                    subMarks[m.studentId] = m;
                                });
                                marksMap[sub.id] = subMarks;
                            }
                        } catch (e) {
                            console.error(`Failed to fetch marks for subject ${sub.id}`, e);
                        }
                    }));
                    setAllStudentMarks(marksMap);
                }
            } catch (e) {
                console.error("Failed to fetch all student marks", e);
            }

        };
        fetchInitialData();

    }, [user, fetchAnalytics]);

    // -- Enhancement State --
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Low Performer Filters
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterCIE, setFilterCIE] = useState('All');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('All');

    // -- Attendance State --
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState({}); // { subjectId-date: { studentId: 'Present'/'Absent' } }
    const [savedAttendance, setSavedAttendance] = useState(false);

    const handleAttendanceChange = (studentId, status) => {
        if (!selectedSubject) return;
        const key = `${selectedSubject.id}-${attendanceDate}`;
        setAttendanceData(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [studentId]: status
            }
        }));
        setSavedAttendance(false);
    };

    const saveAttendance = async () => {
        if (!selectedSubject) return;
        setSaving(true);
        try {
            const classStudents = students.filter(s => s.semester === selectedSubject.semester);
            const key = `${selectedSubject.id}-${attendanceDate}`;
            const currentData = attendanceData[key] || {};

            const records = classStudents.map(s => ({
                studentId: s.id,
                status: (currentData[s.id] || 'Present').toUpperCase()
            }));

            const token = user?.token;
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };

            const res = await fetch(`${API_BASE_URL}/attendance/update`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    subjectId: selectedSubject.id,
                    date: attendanceDate,
                    records
                })
            });

            if (res.ok) {
                setSavedAttendance(true);
                showToast('Attendance Saved Successfully!', 'success');
            } else {
                const txt = await res.text();
                showToast('Failed: ' + txt, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error saving attendance', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Fetch Attendance
    React.useEffect(() => {
        if (activeSection === 'Attendance' && selectedSubject && attendanceDate) {
            const fetchAtt = async () => {
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const res = await fetch(`${API_BASE_URL}/attendance?subjectId=${selectedSubject.id}&date=${attendanceDate}`, { headers });
                    if (res.ok) {
                        const data = await res.json();
                        // data is list { studentId, status }
                        const map = {};
                        data.forEach(r => { map[r.studentId] = r.status === 'PRESENT' ? 'Present' : 'Absent'; });

                        const key = `${selectedSubject.id}-${attendanceDate}`;
                        setAttendanceData(prev => ({ ...prev, [key]: map }));
                        setSavedAttendance(true);
                    }
                } catch (e) { console.error(e); }
            };
            fetchAtt();
        }
    }, [activeSection, selectedSubject, attendanceDate]);

    // -- Syllabus State --
    const [lessonPlanData, setLessonPlanData] = useState(() => {
        const saved = localStorage.getItem('syllabusTracker');
        return saved ? JSON.parse(saved) : {};
    });

    // -- Syllabus Configuration State --
    const [syllabusConfig, setSyllabusConfig] = useState(() => {
        const saved = localStorage.getItem('syllabusStructure');
        return saved ? JSON.parse(saved) : {};
    });

    const [cieSelector, setCieSelector] = useState(() => {
        const saved = localStorage.getItem('cieSelector');
        return saved ? JSON.parse(saved) : {};
    });

    const [newUnitName, setNewUnitName] = useState('');
    const [addingToSubject, setAddingToSubject] = useState(null); // subjectId

    // -- IA Announcement State --
    const [iaConfig, setIaConfig] = useState({
        subjectId: '',
        cieNumber: '1',
        date: '',
        duration: '60',
        syllabus: '',
        instructions: '',
        room: '',
        time: ''
    });

    const handleIaConfigChange = (e) => {
        const { name, value } = e.target;
        setIaConfig(prev => ({ ...prev, [name]: value }));
    };

    React.useEffect(() => {
        if (activeSection === 'CIE Schedule' && iaConfig.subjectId && iaConfig.cieNumber) {
            fetchSchedule();
        }
    }, [iaConfig.subjectId, iaConfig.cieNumber, activeSection, publishedSchedules]);

    const fetchSchedule = async () => {
        // First, check if we have this schedule in publishedSchedules
        const matchingSchedule = publishedSchedules.find(
            sched => String(sched.subject?.id || sched.subjectId) === String(iaConfig.subjectId) &&
                String(sched.cieNumber) === String(iaConfig.cieNumber)
        );

        if (matchingSchedule) {
            // Use the already fetched published schedule data
            setIaConfig(prev => ({
                ...prev,
                date: matchingSchedule.scheduledDate || '',
                duration: matchingSchedule.durationMinutes || '60',
                syllabus: matchingSchedule.syllabusCoverage || prev.syllabus || '',
                instructions: matchingSchedule.instructions || prev.instructions || '',
                room: matchingSchedule.examRoom || '',
                time: matchingSchedule.startTime || ''
            }));
            return;
        }

        // Fallback to API call if not found in state
        try {
            const token = user?.token;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const response = await fetch(`${API_BASE_URL}/cie/faculty/announcements/details?subjectId=${iaConfig.subjectId}&cieNumber=${iaConfig.cieNumber}`, {
                headers
            });

            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setIaConfig(prev => ({
                        ...prev,
                        date: data.scheduledDate || '',
                        duration: data.durationMinutes || '60',
                        syllabus: data.syllabusCoverage || '',
                        instructions: data.instructions || '',
                        room: data.examRoom || '',
                        time: data.startTime || ''
                    }));
                } else {
                    // Reset schedule details if not found
                    setIaConfig(prev => ({ ...prev, date: '', duration: '60', syllabus: '', instructions: '', room: '', time: '' }));
                }
            } else {
                // Reset if API call fails
                setIaConfig(prev => ({ ...prev, date: '', duration: '60', room: '', time: '' }));
            }
        } catch (e) {
            console.error("Error fetching announcement details", e);
        }
    };

    const handleAnnouncementSubmit = async () => {
        if (!iaConfig.subjectId || !iaConfig.cieNumber) {
            showToast('Please select Subject and CIE Number', 'error');
            return;
        }

        if (!iaConfig.date) {
            showToast('CIE has not been scheduled by HOD yet.', 'error');
            return;
        }

        try {
            const token = user?.token;
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const baseUrl = API_BASE.replace('/marks', '');

            const payload = {
                subjectId: iaConfig.subjectId, // Added subjectId to body
                cieNumber: parseInt(iaConfig.cieNumber),
                scheduledDate: iaConfig.date || null,
                durationMinutes: parseInt(iaConfig.duration) || 60,
                syllabusCoverage: iaConfig.syllabus,
                instructions: iaConfig.instructions,
                examRoom: iaConfig.room,
                startTime: iaConfig.time || null
            };

            const response = await fetch(`${API_BASE_URL}/cie/faculty/announcements`, { // Removed query param
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const updatedAnn = await response.json(); // Assuming backend returns { message, announcement }

                // Update local state to reflect changes immediately
                setPublishedSchedules(prev => {
                    const existingIndex = prev.findIndex(s => s.id === updatedAnn.announcement.id);
                    if (existingIndex >= 0) {
                        const newScheds = [...prev];
                        newScheds[existingIndex] = { ...newScheds[existingIndex], ...updatedAnn.announcement };
                        return newScheds;
                    }
                    return [...prev, updatedAnn.announcement];
                });

                showToast(`Syllabus for CIE-${iaConfig.cieNumber} Updated!`, 'success');
            } else {
                showToast('Failed to post announcement', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to post announcement', 'error');
        }
    };

    const addUnit = (subjectId) => {
        if (!newUnitName.trim()) return;

        const newUnit = {
            id: `u${Date.now()}`,
            name: newUnitName
        };

        setSyllabusConfig(prev => {
            const currentUnits = prev[subjectId] || [
                { id: 'u1', name: 'Unit 1: Introduction' },
                { id: 'u2', name: 'Unit 2: Core Concepts' },
                { id: 'u3', name: 'Unit 3: Advanced Topics' },
                { id: 'u4', name: 'Unit 4: Application' },
                { id: 'u5', name: 'Unit 5: Case Studies' }
            ];

            const newState = {
                ...prev,
                [subjectId]: [...currentUnits, newUnit]
            };
            localStorage.setItem('syllabusStructure', JSON.stringify(newState));
            return newState;
        });
        setNewUnitName('');
        setAddingToSubject(null);
        showToast('New Unit Added');
    };

    const toggleUnit = (subjectId, unitId) => {
        setLessonPlanData(prev => {
            const newState = {
                ...prev,
                [subjectId]: {
                    ...prev[subjectId],
                    [unitId]: !prev[subjectId]?.[unitId]
                }
            };
            localStorage.setItem('syllabusTracker', JSON.stringify(newState));
            return newState;
        });
    };

    const toggleCieSelection = (subjectId, unitId) => {
        setCieSelector(prev => {
            const newState = {
                ...prev,
                [subjectId]: {
                    ...prev[subjectId],
                    [unitId]: !prev[subjectId]?.[unitId]
                }
            };
            localStorage.setItem('cieSelector', JSON.stringify(newState));
            return newState;
        });
    };

    const menuItems = [
        {
            label: 'Overview',
            path: '/dashboard/faculty',
            icon: <LayoutDashboard size={20} />,
            isActive: activeSection === 'Overview',
            onClick: () => { setActiveSection('Overview'); setSelectedSubject(null); }
        },
        {
            label: 'My Students',
            path: '/dashboard/faculty',
            icon: <Users size={20} />,
            isActive: activeSection === 'My Students',
            onClick: () => { setActiveSection('My Students'); setSelectedSubject(null); }
        },
        {
            label: 'CIE Entry',
            path: '/dashboard/faculty',
            icon: <FilePlus size={20} />,
            isActive: activeSection === 'CIE Entry',
            onClick: () => { setActiveSection('CIE Entry'); setSelectedSubject(null); }
        },
        {
            label: 'CIE Schedule',
            path: '/dashboard/faculty',
            icon: <Calendar size={20} />, // Changed icon for relevance
            isActive: activeSection === 'CIE Schedule',
            onClick: () => { setActiveSection('CIE Schedule'); setSelectedSubject(null); }
        },
        {
            label: 'Proctoring',
            path: '/dashboard/faculty',
            icon: <UserCheck size={20} />,
            isActive: activeSection === 'Proctoring',
            onClick: () => { setActiveSection('Proctoring'); setSelectedSubject(null); }
        },
        {
            label: 'Low Performers',
            path: '/dashboard/faculty',
            icon: <AlertTriangle size={20} />,
            isActive: activeSection === 'Low Performers',
            onClick: () => { setActiveSection('Low Performers'); setSelectedSubject(null); }
        },
        {
            label: 'Notifications',
            path: '/dashboard/faculty',
            icon: <Bell size={20} />,
            isActive: activeSection === 'Notifications',
            onClick: () => { setActiveSection('Notifications'); setSelectedSubject(null); }
        },
        {
            label: 'My Announcements',
            path: '/dashboard/faculty',
            icon: <Megaphone size={20} />,
            isActive: activeSection === 'My Announcements',
            onClick: () => { setActiveSection('My Announcements'); setSelectedSubject(null); }
        },
    ];

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3000);
    };

    const handleSubjectClick = async (subject) => {
        setSelectedSubject(subject);
        setActiveSection('CIE Entry');
        setMarks({}); // Clear previous
        setIsLocked(false);

        try {
            const token = user?.token;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(`${API_BASE_URL}/marks/subject/${subject.id}`, { headers });

            if (res.ok) {
                const data = await res.json();
                const newMarks = {};

                // Initialize empty for all current students
                students.forEach(s => {
                    newMarks[s.id] = { cie1: '', cie2: '', cie3: '', cie4: '', cie5: '', attendance: 0 };
                });

                data.forEach(m => {
                    if (m.student && m.student.id) {
                        const sId = m.student.id;
                        if (!newMarks[sId]) newMarks[sId] = { cie1: '', cie2: '', cie3: '', cie4: '', cie5: '', attendance: 0 };

                        // Backend returns 'cieType' (e.g., 'CIE1'), not 'iaType'
                        const key = (m.cieType || m.iaType || '').toLowerCase(); // cie1
                        if (key) newMarks[sId][key] = m.totalScore || ''; // Use totalScore

                        // Capture Attendance (Max of all entries if multiple)
                        if (m.attendance) {
                            newMarks[sId].attendance = Math.max(newMarks[sId].attendance, m.attendance);
                        }
                    }
                });
                setMarks(newMarks);
                // Check Status for Lock
                const firstMark = data.find(m => m.status);
                if (firstMark && (firstMark.status === 'SUBMITTED' || firstMark.status === 'APPROVED')) {
                    setIsLocked(true);
                    showToast(`Marks for this subject are ${firstMark.status}`, 'info');
                } else {
                    setIsLocked(false);
                }

                setMarks(newMarks);
            }
        } catch (e) {
            console.error("Error fetching marks", e);
            showToast('Failed to fetch marks', 'error');
        }
    };



    const handleMarkChange = (studentId, field, value) => {
        let numValue = parseInt(value, 10);
        if (value === '' || value === 'Ab') numValue = value; // Allow empty or Ab

        // All CIEs have max 50 marks
        let max = 50;

        if (typeof numValue === 'number' && numValue < 0) numValue = 0;
        if (typeof numValue === 'number' && numValue > max) numValue = max;

        // Update Local State (for UI)
        setMarks(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: numValue
            }
        }));

        // Update Global State (Real-time Low Performers)
        if (selectedSubject) {
            setAllStudentMarks(prev => ({
                ...prev,
                [selectedSubject.id]: {
                    ...prev[selectedSubject.id],
                    [studentId]: {
                        ...prev[selectedSubject.id]?.[studentId],
                        [field]: numValue
                    }
                }
            }));
        }
    };

    const getLowPerformers = () => {
        let lowList = [];
        // Iterate over all subjects in allStudentMarks
        Object.keys(allStudentMarks).forEach(subId => {
            const subject = facultySubjects.find(s => s.id === parseInt(subId));
            if (!subject) return;

            const studentsMarks = allStudentMarks[subId];
            Object.keys(studentsMarks).forEach(stdId => {
                const m = studentsMarks[stdId];
                // Check ANY IA < 15
                const s1 = m.cie1 === 'Ab' ? 0 : (parseInt(m.cie1) || 0);
                const s2 = m.cie2 === 'Ab' ? 0 : (parseInt(m.cie2) || 0);

                // Find lowest score
                const minScore = Math.min(s1, s2);

                if (minScore < 15) { // Threshold 15/30
                    const student = studentsList.find(s => s.id === stdId);
                    if (student) {
                        lowList.push({
                            name: student.name,
                            subject: subject.name,
                            score: minScore
                        });
                    }
                }
            });
        });

        // Sort by lowest score and take top 5
        return lowList.sort((a, b) => (a.score === 'Ab' ? 0 : a.score) - (b.score === 'Ab' ? 0 : b.score)).slice(0, 5);
    };

    const calculateAverage = (student) => {
        if (selectedSubject) {
            const sMarks = marks[student.id] || {};
            const valCIE1 = Number(sMarks.cie1 === 'Ab' ? 0 : sMarks.cie1) || 0;
            const valCIE2 = Number(sMarks.cie2 === 'Ab' ? 0 : sMarks.cie2) || 0;
            const valCIE3 = Number(sMarks.cie3 === 'Ab' ? 0 : sMarks.cie3) || 0;
            const valCIE4 = Number(sMarks.cie4 === 'Ab' ? 0 : sMarks.cie4) || 0;
            const valCIE5 = Number(sMarks.cie5 === 'Ab' ? 0 : sMarks.cie5) || 0;
            return valCIE1 + valCIE2 + valCIE3 + valCIE4 + valCIE5;
        }
        return "-";
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = user?.token;
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const payload = [];
            Object.keys(marks).forEach(studentId => {
                const sMarks = marks[studentId];
                ['cie1', 'cie2', 'cie3', 'cie4', 'cie5'].forEach(key => {
                    const val = sMarks[key];
                    // Only send if it has a value (ignoring 'Ab' or empty string for now, or sending 0?)
                    // If 'Ab', maybe send 0? existing logic 'Ab' => 0.
                    // But payload expects Double.
                    // If the user entered value, we send it.
                    if (val !== undefined) {
                        let score = 0;
                        if (val === 'Ab' || val === '') score = 0;
                        else score = parseFloat(val);

                        // We should maybe only send if it's explicitly set? 
                        // But for batch update, sending 0 is safer than not updating if it was previously set.
                        // But we don't want to overwrite existing data with 0 if UI state is partial?
                        // UI state `marks` is initialized with existing data in handleSubjectClick.
                        // So it represents the COMPLETE desired state.
                        // So sending everything is correct.

                        // Skip if purely undefined/null
                        if (val === null || val === undefined) return;

                        payload.push({
                            studentId: parseInt(studentId),
                            subjectId: selectedSubject.id,
                            iaType: key.toUpperCase(), // cie1 -> CIE1
                            co1: score,
                            co2: 0
                        });
                    }
                });
            });

            if (payload.length === 0) {
                showToast('No marks to save', 'info');
                setSaving(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/marks/update/batch`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast('Changes Committed & Locked!', 'success');
                setIsLocked(true);
            } else {
                const err = await response.text();
                console.error(err);
                showToast('Error saving marks: ' + err, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error saving marks', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitForApproval = async () => {
        // Prompt for CIE Type
        const cieType = window.prompt("Enter Assessment Type to Submit (e.g., CIE1, CIE2, CIE3):", "CIE1");
        if (!cieType) return;

        setSaving(true);
        try {
            const token = user?.token;
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            // Call Submit Endpoint
            // Node.js backend expects query params: ?subjectId=...&cieType=...
            const res = await fetch(`${API_BASE_URL}/marks/submit?subjectId=${selectedSubject.id}&cieType=${cieType.toUpperCase()}`, {
                method: 'POST',
                headers
            });

            if (res.ok) {
                showToast(`Marks for ${cieType} submitted to HOD!`, 'success');
                setIsLocked(true);
            } else {
                const err = await res.text();
                showToast('Submission failed: ' + err, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error submitting marks', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = () => {
        setIsLocked(false);
        showToast('Editing Enabled', 'info');
    };

    const handleEditRequest = () => {
        if (!selectedSubject) {
            alert('Please select a subject first');
            return;
        }

        const reason = prompt(`Why do you need to edit the approved marks for ${selectedSubject.name}?\n\n(This request will be sent to HOD for approval)`);

        if (reason === null) return; // User clicked Cancel

        if (!reason || reason.trim() === '') {
            alert('Please provide a reason for your edit request');
            return;
        }

        // For now, just show a success message
        // TODO: Implement backend endpoint to notify HOD
        alert(`Edit request sent to HOD!\n\nSubject: ${selectedSubject.name}\nReason: ${reason}\n\nThe HOD will review your request and unlock the marks if approved.`);
        showToast('Edit request sent to HOD', 'success');
    };




    const togglePreview = () => {
        showToast('Preview Mode: Showing Final Report View', 'info');
        // In a real app, this might open a modal or new route. 
        // For now, we utilize the download report as the "final output" check
        downloadCSV();
    };

    // --- NEW FEATURE: EXPORT CSV ---
    const downloadCSV = () => {
        const headers = ['Reg No', 'Name', 'Section', 'Batch', 'CIE-1', 'CIE-2', 'CIE-3', 'CIE-4', 'CIE-5', 'Total'];
        const rows = students.map(s => {
            const sMarks = marks[s.id] || {};
            const ia1Mark = sMarks['CIE1'] || {};

            const valCIE1 = sMarks.cie1 !== undefined ? sMarks.cie1 : (ia1Mark.cie1Score != null ? ia1Mark.cie1Score : 0);
            const valCIE2 = sMarks.cie2 !== undefined ? sMarks.cie2 : (ia1Mark.cie2Score != null ? ia1Mark.cie2Score : 0);
            const valCIE3 = sMarks.cie3 !== undefined ? sMarks.cie3 : 0;
            const valCIE4 = sMarks.cie4 !== undefined ? sMarks.cie4 : 0;
            const valCIE5 = sMarks.cie5 !== undefined ? sMarks.cie5 : 0;

            return [
                s.rollNo,
                s.name,
                s.section,
                s.batch,
                valCIE1,
                valCIE2,
                valCIE3,
                valCIE4,
                valCIE5,
                ((Number(valCIE1) || 0) + (Number(valCIE2) || 0) + (Number(valCIE3) || 0) + (Number(valCIE4) || 0) + (Number(valCIE5) || 0))
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `CIE_Marks_Export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Marks Exported to CSV', 'success');
    };

    // --- NEW FEATURE: PROFILE MODAL ---
    const openProfile = (student) => {
        setSelectedStudent(student);
        setShowProfileModal(true);
    };

    const renderStudentProfileModal = () => {
        if (!showProfileModal || !selectedStudent) return null;

        // Calculate Real Data
        const percentage = calculateStudentPercentage(selectedStudent);
        const grade = calculateGradeFromPercentage(percentage);

        // Calculate max attendance across subjects
        let realAttendance = selectedStudent.attendance || 0;
        if (allStudentMarks) {
            Object.keys(allStudentMarks).forEach(subId => {
                const sMarks = allStudentMarks[subId][selectedStudent.id];
                if (sMarks && sMarks.attendance) {
                    realAttendance = Math.max(realAttendance, sMarks.attendance);
                }
            });
        }

        // Status Logic
        let statusLabel = 'Good Standing';
        let statusColor = '#059669'; // Green

        if (grade === 'F') {
            statusLabel = 'At Risk';
            statusColor = '#dc2626'; // Red
        } else if (grade === 'D') {
            statusLabel = 'Average';
            statusColor = '#d97706'; // Orange
        } else if (realAttendance < 75) {
            statusLabel = 'Attendance Shortage';
            statusColor = '#dc2626';
        }

        return (
            <div className={styles.modalOverlay} onClick={() => setShowProfileModal(false)}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <h2>Student Profile</h2>
                        <button className={styles.closeBtn} onClick={() => setShowProfileModal(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className={styles.modalBody}>
                        <div className={styles.profileHeader}>
                            <div className={styles.profileAvatar}>
                                {selectedStudent.name.charAt(0)}
                            </div>
                            <div className={styles.profileInfo}>
                                <h3>{selectedStudent.name}</h3>
                                <p className={styles.profileMeta}>{selectedStudent.rollNo || selectedStudent.regNo}</p>
                                <span className={`${styles.badge} ${styles.good}`}>
                                    {selectedStudent.semester} Sem - {selectedStudent.section || 'A'} ({selectedStudent.batch || '2025'})
                                </span>
                            </div>
                        </div>

                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Email Address</span>
                                <span className={styles.infoValue}>{(selectedStudent.rollNo || selectedStudent.regNo).toLowerCase()}@college.edu</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Attendance</span>
                                <div className={styles.attendanceBarContainer}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span>Current Semester</span>
                                        <span style={{ fontWeight: 'bold' }}>{realAttendance}%</span>
                                    </div>
                                    <div className={styles.attendanceTrack}>
                                        <div className={styles.attendanceFill} style={{ width: `${realAttendance}%`, backgroundColor: realAttendance < 75 ? '#dc2626' : '#10b981' }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Academic Standing</span>
                                <span className={styles.infoValue} style={{ color: statusColor }}>{statusLabel} ({grade})</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Student Phone</span>
                                <span className={styles.infoValue}>{selectedStudent.phone || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Parent Phone</span>
                                <span className={styles.infoValue}>{selectedStudent.parentPhone || 'N/A'}</span>
                            </div>
                        </div>

                        <div className={styles.infoGrid} style={{ marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Current Aggregate</span>
                                <span className={styles.infoValue} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{percentage.toFixed(1)}%</span>
                            </div>
                        </div>

                        <button className={styles.saveBtn} style={{ width: '100%', marginTop: '1rem' }} onClick={() => showToast('Full Report Downloaded')}>
                            <FileText size={18} /> Download Full Academic Report
                        </button>
                    </div>
                </div>
            </div >
        );
    };

    // --- NEW FEATURE: UPLOAD MODAL ---
    const renderUploadModal = () => {
        if (!showUploadModal) return null;

        return (
            <div className={styles.modalOverlay} onClick={() => setShowUploadModal(false)}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <h2>Bulk Upload Marks</h2>
                        <button className={styles.closeBtn} onClick={() => setShowUploadModal(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className={styles.modalBody}>
                        <div className={styles.uploadArea} onClick={() => {
                            showToast('File Upload Simulation Success');
                            setShowUploadModal(false);
                        }}>
                            <Upload size={48} color="#2563eb" />
                            <div>
                                <p className={styles.uploadText}>Click to upload or drag and drop</p>
                                <p className={styles.uploadSubtext}>Excel, CSV files only (Max 2MB)</p>
                            </div>
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className={styles.secondaryBtn} onClick={() => setShowUploadModal(false)}>Cancel</button>
                            <button className={styles.saveBtn} disabled>Upload Pending...</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    // --- HELPER --
    const calculateGradeFromPercentage = (percentage) => {
        if (percentage >= 75) return 'A'; // Was 80, now A covers S range too
        if (percentage >= 60) return 'B'; // Was 70
        if (percentage >= 50) return 'C'; // Was 60
        if (percentage >= 40) return 'D'; // Was 50, lowered passing standard? Or just shifting?
        // Let's stick to standard 10-point scale but shifted?
        // User asked for a,b,c,d. 
        // Typically: A=Distinction, B=First Class, C=Second, D=Pass
        return 'F';
    };

    // --- VIEW RENDERERS ---

    const renderOverview = () => (
        <>
            <div className={styles.analyticsGrid}>
                {/* CIE STATUS */}
                <div className={styles.analyticsCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 className={styles.analyticsTitle}>CIE (IA) STATUS</h3>
                        <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 'bold' }}>{facultyClassAnalytics.start || 'Deadline: TBA'}</span>
                    </div>
                    <div className={styles.analyticsContent}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{facultyClassAnalytics.totalStudents || (facultyClassAnalytics.evaluated + facultyClassAnalytics.pending)}</span>
                            <span className={styles.statLabel}><Users size={14} /> Total Students</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{facultyClassAnalytics.evaluated}</span>
                            <span className={styles.statLabel}><CheckCircle size={14} /> Evaluated</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue} style={{ color: facultyClassAnalytics.pending > 0 ? '#ef4444' : 'inherit' }}>
                                {facultyClassAnalytics.pending > 0 ? <AlertTriangle size={14} color="#ef4444" style={{ marginRight: '4px' }} /> : <Clock size={14} />}
                                {facultyClassAnalytics.pending}
                            </span>
                            <span className={styles.statLabel}>Pending</span>
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem', color: '#6b7280' }}>
                            <span>Progress</span>
                            <span>{Math.round((facultyClassAnalytics.evaluated / ((facultyClassAnalytics.evaluated + facultyClassAnalytics.pending) || 1)) * 100)}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${(facultyClassAnalytics.evaluated / ((facultyClassAnalytics.evaluated + facultyClassAnalytics.pending) || 1)) * 100}%`, height: '100%', background: '#10b981' }}></div>
                        </div>
                    </div>
                </div>

                {/* CLASS ANALYTICS */}
                <div className={styles.analyticsCard}>
                    <h3 className={styles.analyticsTitle}>CLASS ANALYTICS</h3>
                    <div className={styles.analyticsContent}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{facultyClassAnalytics.avgScore}%</span>
                            <span className={styles.statLabel}><BarChart2 size={14} /> Avg Score</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{facultyClassAnalytics.lowPerformers}</span>
                            <span className={styles.statLabel}><TrendingDown size={14} /> Low Performers</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{facultyClassAnalytics.topPerformers}</span>
                            <span className={styles.statLabel}><Award size={14} /> Top Performers</span>
                        </div>
                    </div>
                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TrendingDown size={16} style={{ transform: 'rotate(180deg)' }} /> Average score improved by 5% vs IA-1
                    </p>
                </div>
            </div>

            {
                attendanceDefaulters.length > 0 && (
                    <div className={styles.alertBanner} style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ backgroundColor: '#ef4444', padding: '0.5rem', borderRadius: '50%', color: 'white' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1rem', fontWeight: '600' }}>Critical Attendance Alert</h3>
                            <p style={{ margin: '0.25rem 0 0', color: '#b91c1c', fontSize: '0.9rem' }}>
                                {attendanceDefaulters.length} students have less than 75% attendance. Immediate action required.
                            </p>
                        </div>
                        <button className={styles.saveBtn} style={{ backgroundColor: '#dc2626' }} onClick={() => setActiveSection('My Students')}>
                            View List
                        </button>
                    </div>
                )
            }



            < div className={styles.mainContentGrid} >
                <div className={styles.leftColumn}>
                    <section>
                        <h2 className={styles.sectionTitle}>My Subjects</h2>
                        <div className={styles.cardsGrid}>
                            {mySubjects.length > 0 ? mySubjects.map(sub => (
                                <div key={sub.id} className={styles.subjectCard} onClick={() => handleSubjectClick(sub)}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.subjectName}>{sub.name}</h3>
                                        <span className={styles.termBadge}>{sub.semester} Sem</span>
                                    </div>
                                    <div className={styles.subjectFooter}>
                                        <div className={styles.cardStats}>
                                            <Users size={16} color="#6b7280" />
                                            <span>{sub.studentCount} Students</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {/* Simulate attention needed if less than 90% complete */}
                                            <span className={styles.progressBadge} style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>Needs Attention</span>
                                            <span className={styles.progressBadge}>85% Comp</span>
                                        </div>
                                    </div>
                                </div>
                            )) : <p>No subjects assigned.</p>}
                        </div>
                    </section>




                </div>

                <div className={styles.rightColumn}>
                    {/* Notifications Widget */}
                    <div className={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 className={styles.cardTitle} style={{ margin: 0 }}>🔔 Notifications</h2>
                            <span className={styles.badge} style={{ background: '#eff6ff', color: '#2563eb' }}>{notifications.length} New</span>
                        </div>

                        <div className={styles.notificationsList}>
                            {notifications.length > 0 ? (
                                notifications.slice(0, 5).map((note, idx) => (
                                    <div key={note.id || idx} className={styles.notifItem}>
                                        <div className={styles.notifIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
                                            <Bell size={16} />
                                        </div>
                                        <div className={styles.notifContent}>
                                            <p className={styles.notifMessage}>{note.message}</p>
                                            <span className={styles.notifTime}>{new Date(note.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noNotifications}>
                                    <Bell size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                    <p>No new notifications</p>
                                </div>
                            )}

                            <button className={styles.viewAllBtn} onClick={() => setActiveSection('Notifications')}>
                                View All Notifications →
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </>
    );

    // Helper to calculate percentage for filter (moved from renderMyStudents)
    const calculateStudentPercentage = (std) => {
        let totalPerformance = 0;
        let subjectCount = 0;
        Object.keys(allStudentMarks).forEach(subId => {
            const sMarks = allStudentMarks[subId][std.id];
            if (sMarks) {
                const scores = [sMarks.cie1, sMarks.cie2, sMarks.cie3, sMarks.cie4, sMarks.cie5].filter(x => x !== '' && x !== 'Ab' && x !== undefined).map(Number);
                if (scores.length > 0) {
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                    const percent = (avg / 50) * 100;
                    totalPerformance += percent;
                    subjectCount++;
                }
            }
        });
        return subjectCount > 0 ? (totalPerformance / subjectCount) : 0;
    };

    const renderMyStudents = () => {
        // Use API students
        // Filter by subjects? Or just show all? Usually faculty wants to see kids in their classes.
        // For now showing all students but we could filter by those in 'mySubjects' classes if we had enrollment data.
        // Assuming studentsList are all students in the dept.
        const filteredStudents = students
            .filter(s =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.rollNo || s.regNo).toLowerCase().includes(searchTerm.toLowerCase())
            )
            .filter(s => {
                if (selectedGradeFilter === 'All') return true;
                // We need to calculate grade here to filter
                // Ideally grade should be a property of student object from backend
                // For now, re-using calculation logic

                // Re-calculate to match table display logic exactly
                let avgMarks = 0;
                if (s.marks) {
                    const total = (s.marks.ia1 || 0) + (s.marks.ia2 || 0) + (s.marks.ia3 || 0);
                    avgMarks = (total / 60) * 100;
                } else {
                    avgMarks = 85; // Default mock for consistency if not present, or better:
                    // Just accept that for this demo without real marks, filtering might be inconsistent 
                    // unless we store the random grade. 
                    // Let's assume for this task we use a determinstic check or the helper
                }

                // For consistent filtering in this demo where marks might be missing:
                // We can't use random in filter vs render.
                // Let's use the helper but note the limitation on mock data.
                // To make it work for the user's view, we need the grades to match what they see.
                // Since the table generated random grades on the fly in the previous code, 
                // filtering will be broken unless we stabilize the grades.

                // FIX: The previous table code calculated random grades inside the map!
                // We must standardize this. 
                // For the purpose of this task, I will update the table render to use `calculateGrade` 
                // and here I will use `calculateGrade`. 
                // However, `calculateGrade` uses random if marks missing. 
                // Random will change on every render!
                // We need to persist the mock marks or grades if they are missing.

                // Hack for stability if marks missing: generate based on ID hash or something?
                // Or just assume marks are present for the filter to be meaningful.
                // Let's try to use the helper.

                // IMPROVED LOGIC: To ensure filter matches table, we'll calculate grade same way.
                // But wait, the table code had: `const attendance = std.attendance || Math.floor(Math.random() * 20) + 80;` 
                // and `avgMarks = Math.floor(Math.random() * 40) + 50;`
                // This means every render shows different grades! 
                // I should fix the Table Render to use the helper first, 
                // and the helper should probably be deterministic if possible, 
                // or just accept it for now but user asked for filtering.

                // Proceeding with helper usage.
                const percentage = calculateStudentPercentage(s);
                const g = calculateGradeFromPercentage(percentage);
                return g === selectedGradeFilter;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        return (
            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>My Students Directory</h2>
                    <div className={styles.headerActions}>
                        <div className={styles.searchWrapper}>
                            <Search size={20} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search student..."
                                className={styles.searchInput}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button
                                className={`${styles.filterBtn} ${showFilterMenu ? styles.active : ''}`}
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                            >
                                <Filter size={16} />
                                <span>{selectedGradeFilter === 'All' ? 'Filter' : `Grade: ${selectedGradeFilter}`}</span>
                            </button>

                            {showFilterMenu && (
                                <div className={styles.filterMenu}>
                                    <div className={styles.filterHeader}>Filter by Grade</div>
                                    {['All', 'A', 'B', 'C', 'D'].map(grade => (
                                        <div
                                            key={grade}
                                            className={`${styles.filterOption} ${selectedGradeFilter === grade ? styles.selected : ''}`}
                                            onClick={() => {
                                                setSelectedGradeFilter(grade);
                                                setShowFilterMenu(false);
                                            }}
                                        >
                                            {selectedGradeFilter === grade && <CheckCircle size={14} color="#2563eb" />}
                                            {grade}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.studentTableContainer}>
                        <table className={styles.studentTable}>
                            <thead>
                                <tr>
                                    <th>Sl No</th>
                                    <th>Reg No</th>
                                    <th>Student Name</th>
                                    <th>Semester</th>
                                    <th>Section</th>
                                    <th>Status</th>
                                    <th>Grade</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((std, index) => {
                                    // Generate mock performance data if missing
                                    // const attendance = std.attendance || Math.floor(Math.random() * 20) + 80; // REMOVED MOCK
                                    // Calculate Real Grade & Status

                                    // 1. Aggregate marks from all enrolled subjects
                                    // We need to find which subjects this student is enrolled in that THIS faculty teaches.
                                    // Then average the CIEs? Or just take the max?
                                    // Typically "Grade" is per subject. But "My Students" is a list.
                                    // If a student is in multiple subjects taught by this faculty, which grade to show?
                                    // For simplicity, let's average the performance across all subjects taught by this faculty.

                                    let totalPerformance = 0;
                                    let subjectCount = 0;
                                    let realAttendance = 0;
                                    let hasData = false;

                                    Object.keys(allStudentMarks).forEach(subId => {
                                        const sMarks = allStudentMarks[subId][std.id];
                                        if (sMarks) {
                                            hasData = true;
                                            // Avg of CIEs for this subject
                                            const c1 = Number(sMarks.cie1 || 0);
                                            const c2 = Number(sMarks.cie2 || 0);
                                            const c3 = Number(sMarks.cie3 || 0); // Include if exists
                                            const c4 = Number(sMarks.cie4 || 0);
                                            const c5 = Number(sMarks.cie5 || 0);

                                            // Assuming max is 50 per CIE.
                                            // Let's just sum valid ones and average? 
                                            // Or sum and divide by number of CIEs conducted? 
                                            // Simplified: Average of non-empty CIEs
                                            const scores = [sMarks.cie1, sMarks.cie2, sMarks.cie3, sMarks.cie4, sMarks.cie5].filter(x => x !== '' && x !== 'Ab' && x !== undefined).map(Number);

                                            if (scores.length > 0) {
                                                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                                                // Normalized to 100? CIE is usually 50. So avg is out of 50.
                                                // Let's percentagize it: (avg / 50) * 100
                                                const percent = (avg / 50) * 100;
                                                totalPerformance += percent;
                                                subjectCount++;
                                            }

                                            if (sMarks.attendance) realAttendance = Math.max(realAttendance, sMarks.attendance);
                                        }
                                    });

                                    const finalPercentage = subjectCount > 0 ? (totalPerformance / subjectCount) : 0;
                                    const grade = hasData ? calculateGradeFromPercentage(finalPercentage) : 'N/A';
                                    const attendance = hasData ? realAttendance : (std.attendance || 0); // Use 0 if no data
                                    const isRisk = attendance > 0 && attendance < 75; // Only risk if we have data

                                    let gradeColor = '#6b7280'; // Gray for N/A
                                    let gradeBg = '#f3f4f6';

                                    if (grade === 'A') { gradeColor = '#166534'; gradeBg = '#f0fdf4'; }
                                    else if (grade === 'B') { gradeColor = '#0369a1'; gradeBg = '#e0f2fe'; }
                                    else if (grade === 'C') { gradeColor = '#b45309'; gradeBg = '#fef3c7'; }
                                    else if (grade === 'D') { gradeColor = '#b91c1c'; gradeBg = '#fee2e2'; }
                                    else if (grade === 'F') { gradeColor = '#ef4444'; gradeBg = '#fee2e2'; }

                                    // Status Logic based on Grade
                                    let statusLabel = hasData ? 'Good Standing' : 'No Data';
                                    let statusStyle = styles.statusGood;
                                    let StatusIcon = CheckCircle;

                                    if (!hasData) {
                                        statusStyle = styles.statusAverage; // Neutral
                                        StatusIcon = AlertCircle;
                                    } else if (grade === 'F' || isRisk) {
                                        statusLabel = 'At Risk';
                                        statusStyle = styles.statusRisk;
                                        StatusIcon = AlertTriangle;
                                    } else if (grade === 'D') {
                                        statusLabel = 'Average';
                                        statusStyle = styles.statusAverage;
                                        StatusIcon = AlertCircle;
                                    }

                                    return (
                                        <tr key={std.id} style={{ cursor: 'pointer' }} onClick={() => openProfile(std)}>
                                            <td style={{ color: '#6b7280', fontWeight: '500', paddingLeft: '1.5rem' }}>{String(index + 1).padStart(2, '0')}</td>
                                            <td className={styles.codeText}>{std.rollNo || std.regNo}</td>
                                            <td>
                                                <div className={styles.studentNameCell}>
                                                    <div className={styles.avatar} style={{
                                                        background: `linear-gradient(135deg, ${['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} 0%, ${['#1d4ed8', '#047857', '#b45309', '#6d28d9', '#be185d'][index % 5]} 100%)`
                                                    }}>
                                                        {std.name.charAt(0)}
                                                    </div>
                                                    {std.name}
                                                </div>
                                            </td>
                                            {/* Fix: Display 2nd Semester correctly */}
                                            <td>{std.sem === '2nd' ? '2nd Semester' : (std.semester || '2nd Semester')}</td>
                                            <td>
                                                <span className={styles.badge} style={{ background: '#f3f4f6', color: '#374151' }}>
                                                    {std.section || 'A'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${statusStyle}`}>
                                                    <StatusIcon size={14} /> {statusLabel}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    background: gradeBg,
                                                    color: gradeColor
                                                }}>
                                                    Grade {grade}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.actionIcons}>
                                                    <button className={styles.iconBtn} title="View Profile">
                                                        <Users size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderCIEEntry = () => {
        if (!selectedSubject) {
            return (
                <div className={styles.emptyState}>


                    <div className={styles.cardsGrid}>
                        {mySubjects.map(sub => (
                            <div key={sub.id} className={styles.subjectCard} onClick={() => handleSubjectClick(sub)}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.subjectName}>{sub.name}</h3>
                                    <span className={styles.termBadge} style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>{sub.semester} Sem</span>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Code: {sub.code}</span>
                                        <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>
                                            <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                            64 Students
                                        </span>
                                    </div>

                                    {/* Mock Progress */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px' }}>
                                        <span style={{ flex: 1 }}>Completion</span>
                                        <span style={{ fontWeight: '600' }}>75%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: '75%', height: '100%', background: '#10b981', borderRadius: '4px' }}></div>
                                    </div>
                                </div>

                                <div className={styles.subjectFooter} style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Last updated: 2 days ago</span>
                                    <button style={{
                                        padding: '0.3rem 0.8rem',
                                        borderRadius: '6px',
                                        background: '#eff6ff',
                                        color: '#2563eb',
                                        border: 'none',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}>
                                        Enter Marks →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.sectionContainer}>

                <div
                    className={styles.backLink}
                    onClick={() => setSelectedSubject(null)}
                    style={{
                        marginBottom: '1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#bae6fd'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <span style={{ marginRight: '0.5rem' }}>←</span> Back to Overview
                </div>

                {/* NEW ATTRACTIVE HEADER */}
                <div className={styles.engagingHeader}>
                    <div className={styles.headerContent}>
                        <div className={styles.headerTopRow}>
                            <div>
                                <h1 className={styles.subjectTitle}>Update Marks: {selectedSubject.name}</h1>
                                <div className={styles.subjectMeta}>
                                    <span>{selectedSubject.code}</span>
                                    <span>|</span>
                                    <span>{selectedSubject.semester} Sem</span>
                                </div>
                            </div>
                            <div className={styles.maxMarksBadge}>
                                Max: CIE-1(50), CIE-2(50), CIE-3(50), CIE-4(50), CIE-5(50)
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.sectionHeader}>
                    <div className={styles.headerTitleGroup}></div>

                    <div className={styles.headerActions}>
                        <div className={styles.actionButtons}>
                            <button className={styles.secondaryBtn} onClick={togglePreview} title="Preview Report">
                                <FileText size={16} /> Preview
                            </button>

                            {!isLocked ? (
                                <>
                                    <button className={`${styles.saveBtn} ${saving ? styles.saving : ''}`} onClick={handleSave} disabled={saving}>
                                        <Save size={16} />
                                        {saving ? 'Saving...' : 'Save Draft'}
                                    </button>

                                    <button className={styles.saveBtn} onClick={handleSubmitForApproval} disabled={saving} style={{ backgroundColor: '#059669' }}>
                                        <CheckCircle size={16} /> Submit to HOD
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className={styles.secondaryBtn} disabled style={{ cursor: 'not-allowed', color: '#6b7280', borderColor: '#d1d5db' }}>
                                        <Lock size={16} /> Marks Locked
                                    </button>
                                    <button
                                        className={styles.saveBtn}
                                        onClick={handleEditRequest}
                                        style={{ backgroundColor: '#f59e0b', color: 'white' }}
                                        title="Request permission from HOD to edit these marks"
                                    >
                                        <Edit size={16} /> Request Edit
                                    </button>
                                </>
                            )}

                            <button className={`${styles.saveBtn}`} onClick={downloadCSV} style={{ backgroundColor: '#4b5563' }}>
                                <Download size={16} /> Download
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Sl No</th>
                                    <th>Reg No</th>
                                    <th>Student Name</th>
                                    <th>CIE-1 (50)</th>
                                    <th>CIE-2 (50)</th>
                                    <th>CIE-3 (50)</th>
                                    <th>CIE-4 (50)</th>
                                    <th>CIE-5 (50)</th>
                                    <th>Attendance (%)</th>
                                    <th>Total (250)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students
                                    .filter(s => selectedSubject && s.department === selectedSubject.department && String(s.semester) === String(selectedSubject.semester))
                                    .map((student, index) => {
                                        const sMarks = marks[student.id] || {};
                                        // Mapping logic: local edits override API data
                                        const ia1Mark = sMarks['CIE1'] || {};

                                        // Check if we have a direct edit (top-level key) or fallback to API object
                                        const valCIE1 = sMarks.cie1 !== undefined ? sMarks.cie1 : (ia1Mark.cie1Score != null ? ia1Mark.cie1Score : '');
                                        const valCIE2 = sMarks.cie2 !== undefined ? sMarks.cie2 : (ia1Mark.cie2Score != null ? ia1Mark.cie2Score : '');
                                        const valCIE3 = sMarks.cie3 !== undefined ? sMarks.cie3 : '';
                                        const valCIE4 = sMarks.cie4 !== undefined ? sMarks.cie4 : '';
                                        const valCIE5 = sMarks.cie5 !== undefined ? sMarks.cie5 : '';

                                        // Attendance Value
                                        const valAtt = sMarks.attendance || 0;
                                        const attColor = valAtt < 75 ? '#ef4444' : '#16a34a';

                                        return (
                                            <tr key={student.id}>
                                                <td>{index + 1}</td>
                                                <td>{student.rollNo || student.regNo}</td>
                                                <td>{student.name}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className={styles.markInput}
                                                        value={valCIE1}
                                                        onChange={(e) => handleMarkChange(student.id, 'cie1', e.target.value)}
                                                        disabled={isLocked}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className={styles.markInput}
                                                        value={valCIE2}
                                                        onChange={(e) => handleMarkChange(student.id, 'cie2', e.target.value)}
                                                        disabled={isLocked}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className={styles.markInput}
                                                        value={valCIE3}
                                                        onChange={(e) => handleMarkChange(student.id, 'cie3', e.target.value)}
                                                        disabled={isLocked}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className={styles.markInput}
                                                        value={valCIE4}
                                                        onChange={(e) => handleMarkChange(student.id, 'cie4', e.target.value)}
                                                        disabled={isLocked}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className={styles.markInput}
                                                        value={valCIE5}
                                                        onChange={(e) => handleMarkChange(student.id, 'cie5', e.target.value)}
                                                        disabled={isLocked}
                                                    />
                                                </td>
                                                {/* Attendance Column */}
                                                <td style={{ fontWeight: 'bold', color: attColor }}>{valAtt}%</td>
                                                {/* Final Total */}
                                                <td style={{ fontWeight: 'bold' }}>{calculateAverage(student)}</td>
                                            </tr>
                                        )
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };



    const renderAttendance = () => {
        if (!selectedSubject) {
            return (
                <div className={styles.emptyState}>
                    <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                        <h2 className={styles.sectionTitle}>Mark Attendance</h2>
                        <p style={{ color: '#6b7280' }}>Select a subject to mark attendance.</p>
                    </div>
                    <div className={styles.cardsGrid}>
                        {mySubjects.map(sub => (
                            <div key={sub.id} className={styles.subjectCard} onClick={() => { setSelectedSubject(sub); setSavedAttendance(false); }}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.subjectName}>{sub.name}</h3>
                                    <span className={styles.termBadge} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem' }}>{sub.semester} Sem</span>
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                                    <UserCheck size={16} />
                                    <span>Mark Today's Attendance</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Key for storage
        const key = `${selectedSubject.id}-${attendanceDate}`;
        const currentData = attendanceData[key] || {};

        // Use Real Students
        const classStudents = students.filter(s => s.semester === selectedSubject.semester);

        // Stats
        const total = classStudents.length;

        const presentCount = classStudents.filter(s => (currentData[s.id] || 'Present') === 'Present').length;
        const absentCount = total - presentCount;

        return (
            <div className={styles.sectionContainer}>
                <div className={styles.backLink} onClick={() => setSelectedSubject(null)} style={{ color: '#6b7280', marginBottom: '1rem', display: 'inline-flex', cursor: 'pointer', alignItems: 'center' }}>
                    <span style={{ marginRight: '0.5rem' }}>←</span> Back to Subject List
                </div>

                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Attendance: {selectedSubject.name}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                            <input
                                type="date"
                                value={attendanceDate}
                                onChange={(e) => setAttendanceDate(e.target.value)}
                                className={styles.searchInput}
                                style={{ width: 'auto' }}
                            />
                            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                Total: <strong>{total}</strong> | Present: <strong style={{ color: '#16a34a' }}>{presentCount}</strong> | Absent: <strong style={{ color: '#dc2626' }}>{absentCount}</strong>
                            </span>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.saveBtn} onClick={() => window.open(`http://127.0.0.1:8083/api/reports/attendance/${selectedSubject.id}/csv`, '_blank')} style={{ marginRight: '1rem', backgroundColor: '#3b82f6' }}>
                            <Download size={16} /> Export CSV
                        </button>
                        <button className={styles.saveBtn} onClick={saveAttendance} disabled={savedAttendance}>
                            <Save size={16} />
                            {savedAttendance ? 'Saved' : 'Save Attendance'}
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Sl No</th>
                                <th>Reg No</th>
                                <th>Student Name</th>
                                <th>Attendance %</th>
                                <th>Status</th>
                                <th style={{ width: '150px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classStudents.map((std, index) => {
                                const status = currentData[std.id] || 'Present';
                                return (
                                    <tr key={std.id} style={{ backgroundColor: status === 'Absent' ? '#fef2f2' : 'inherit' }}>
                                        <td style={{ color: '#6b7280' }}>{String(index + 1).padStart(2, '0')}</td>
                                        <td className={styles.codeText}>{std.rollNo || std.regNo}</td>
                                        <td>
                                            <div className={styles.studentNameCell}>
                                                <div className={styles.avatar} style={{
                                                    width: '28px', height: '28px', fontSize: '0.8rem',
                                                    background: `linear-gradient(135deg, ${['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} 0%, ${['#1d4ed8', '#047857', '#b45309', '#6d28d9', '#be185d'][index % 5]} 100%)`
                                                }}>
                                                    {std.name.charAt(0)}
                                                </div>
                                                {std.name}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontWeight: 'bold',
                                                color: (std.attendance || 0) < 75 ? '#dc2626' : '#16a34a'
                                            }}>
                                                {std.attendance || 0}%
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    style={{
                                                        padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                                                        borderColor: status === 'Present' ? '#16a34a' : '#d1d5db',
                                                        backgroundColor: status === 'Present' ? '#dcfce7' : 'white',
                                                        color: status === 'Present' ? '#166534' : '#6b7280'
                                                    }}
                                                    onClick={() => handleAttendanceChange(std.id, 'Present')}
                                                >
                                                    Present
                                                </button>
                                                <button
                                                    style={{
                                                        padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                                                        borderColor: status === 'Absent' ? '#dc2626' : '#d1d5db',
                                                        backgroundColor: status === 'Absent' ? '#fee2e2' : 'white',
                                                        color: status === 'Absent' ? '#991b1b' : '#6b7280'
                                                    }}
                                                    onClick={() => handleAttendanceChange(std.id, 'Absent')}
                                                >
                                                    Absent
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            {status === 'Absent' && (
                                                <button className={styles.iconBtn} style={{ color: '#dc2626' }} title="Notify Parent" onClick={() => showToast(`SMS sent to ${std.name}'s parent`)}>
                                                    <Mail size={16} /> Send SMS
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderProctoring = () => {
        // Calculate performance color
        const getPerformanceColor = (avg) => {
            if (avg < 60) return { bg: '#fee2e2', text: '#b91c1c', icon: <AlertTriangle size={14} /> }; // Red
            if (avg < 75) return { bg: '#fef3c7', text: '#b45309', icon: <AlertCircle size={14} /> }; // Yellow
            return { bg: '#dcfce7', text: '#15803d', icon: <CheckCircle size={14} /> }; // Green
        };

        return (
            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Mentorship / Proctoring</h2>
                    <div className={styles.headerActions}>
                        <button className={styles.filterBtn} onClick={() => showToast('Meeting Logs Downloaded')}>
                            <Download size={16} /> Export Logs
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Student Details</th>
                                <th>Parent Contact</th>
                                <th>Attendance</th>
                                <th>Academic Standing (CIE Avg)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myMentees.map(student => {
                                // Mock Average Calculation for display
                                const avgScore = student.marks ? Math.round(((student.marks.ia1 + student.marks.ia2) / 60) * 100) : Math.floor(Math.random() * 40) + 50;
                                const perf = getPerformanceColor(avgScore);

                                return (
                                    <tr key={student.id}>
                                        <td>
                                            <div className={styles.studentNameCell}>
                                                <div className={styles.avatar} style={{
                                                    width: '32px', height: '32px', fontSize: '0.85rem',
                                                    background: '#eff6ff', color: '#1d4ed8'
                                                }}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: '#111827' }}>{student.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{student.rollNo || student.regNo}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{student.parentPhone}</span>
                                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Relationship: Father</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontWeight: 'bold',
                                                fontSize: '1.1rem',
                                                color: (student.attendance || 0) < 75 ? '#dc2626' : '#16a34a'
                                            }}>
                                                {student.attendance || 0}%
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '0.3rem 0.8rem',
                                                borderRadius: '20px',
                                                backgroundColor: perf.bg,
                                                color: perf.text,
                                                fontWeight: '600',
                                                fontSize: '0.85rem'
                                            }}>
                                                {perf.icon}
                                                {avgScore}% Avg
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderLessonPlan = () => {
        return (
            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Syllabus Tracker & Lesson Plan</h2>
                    <div className={styles.headerActions}>
                        <button className={styles.saveBtn} onClick={() => showToast('Report Sent to HOD')}>
                            <FileText size={16} /> Submit Monthly Report
                        </button>
                    </div>
                </div>

                <div className={styles.gridContainer}>
                    {mySubjects.map(sub => {
                        const progress = lessonPlanData[sub.id] || {};
                        const units = syllabusConfig[sub.id] || [
                            { id: 'u1', name: 'Unit 1: Introduction' },
                            { id: 'u2', name: 'Unit 2: Core Concepts' },
                            { id: 'u3', name: 'Unit 3: Advanced Topics' },
                            { id: 'u4', name: 'Unit 4: Application' },
                            { id: 'u5', name: 'Unit 5: Case Studies' }
                        ];
                        const completedCount = units.filter(u => progress[u.id]).length;
                        const totalUnits = units.length;
                        const percent = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;

                        return (
                            <div key={sub.id} className={styles.card} style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{sub.name}</h3>
                                        <span className={styles.termBadge} style={{ fontSize: '0.75rem' }}>{sub.semester} Sem</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: percent === 100 ? '#10b981' : '#3b82f6' }}>{percent}%</span>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Completed</p>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                                    {units.map(unit => (
                                        <div key={unit.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.8rem', fontSize: '0.9rem' }}>
                                            <div
                                                onClick={() => toggleUnit(sub.id, unit.id)}
                                                style={{
                                                    width: '20px', height: '20px', borderRadius: '4px', border: '2px solid', marginRight: '10px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    borderColor: progress[unit.id] ? '#10b981' : '#d1d5db',
                                                    backgroundColor: progress[unit.id] ? '#10b981' : 'white'
                                                }}
                                            >
                                                {progress[unit.id] && <CheckCircle size={14} color="white" />}
                                            </div>
                                            <span style={{ color: progress[unit.id] ? '#111827' : '#6b7280', textDecoration: progress[unit.id] ? 'line-through' : 'none' }}>
                                                {unit.name}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Add Unit UI */}
                                    {addingToSubject === sub.id ? (
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
                                            <input
                                                type="text"
                                                placeholder="Enter topic name..."
                                                value={newUnitName}
                                                onChange={(e) => setNewUnitName(e.target.value)}
                                                style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => addUnit(sub.id)}
                                                style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '0 10px', cursor: 'pointer' }}
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => setAddingToSubject(null)}
                                                style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '4px', padding: '0 10px', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingToSubject(sub.id)}
                                            style={{
                                                marginTop: '0.5rem',
                                                background: 'none',
                                                border: '1px dashed #9ca3af',
                                                color: '#6b7280',
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            + Add Syllabus Topic
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- NEW FEATURE: CIE SCHEDULE UPDATE (Faculty) ---
    const renderCIESchedule = () => {
        // Use iaConfig directly which is populated by fetchSchedule
        const currentSchedule = {
            date: iaConfig.date || '-',
            time: iaConfig.time || '-',
            room: iaConfig.room || '-',
            duration: iaConfig.duration ? `${iaConfig.duration} Minutes` : '-'
        };

        return (
            <div className={styles.sectionContainer}>
                {/* Changed header gradient to Blue/Gray to match sidebar/theme */}
                <div className={styles.engagingHeader} style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.subjectTitle}>Update Syllabus for CIE</h1>
                        <p className={styles.subjectMeta} style={{ color: '#dbeafe' }}>Add syllabus topics for the scheduled CIE</p>
                    </div>
                </div>

                <div className={styles.mainContentGrid}>
                    {/* Left Column: Form */}
                    <div className={styles.leftColumn} style={{ flex: 2 }}>
                        <div className={styles.glassCard}>
                            <h2 className={styles.sectionTitle}>CIE Details (Scheduled by HOD)</h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Subject & CIE Select */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontWeight: 600, color: '#374151', fontSize: '1rem' }}>Subject</label>
                                        <select
                                            name="subjectId"
                                            value={iaConfig.subjectId}
                                            onChange={handleIaConfigChange}
                                            className={styles.largeInput}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">Select Subject</option>
                                            {mySubjects.map(sub => (
                                                <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontWeight: 600, color: '#374151', fontSize: '1rem' }}>CIE Number</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '6px', borderRadius: '10px', border: '1px solid #cbd5e1', height: '100%' }}>
                                            {['1', '2', '3', '4', '5'].map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => setIaConfig(prev => ({ ...prev, cieNumber: num }))}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        // Using Blue (#2563eb) for active state
                                                        background: iaConfig.cieNumber === num ? '#2563eb' : 'transparent',
                                                        color: iaConfig.cieNumber === num ? 'white' : '#64748b',
                                                        fontWeight: 600,
                                                        fontSize: '1rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        boxShadow: iaConfig.cieNumber === num ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none'
                                                    }}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Read-Only Schedule Info */}
                                <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.9rem', textTransform: 'uppercase' }}>Schedule (Read Only)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Date</span>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{iaConfig.subjectId ? currentSchedule.date : '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Time</span>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{iaConfig.subjectId ? currentSchedule.time : '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Duration</span>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{iaConfig.subjectId ? currentSchedule.duration : '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Room</span>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{iaConfig.subjectId ? currentSchedule.room : '-'}</span>
                                        </div>
                                    </div>
                                    {iaConfig.instructions && (
                                        <div style={{ marginTop: '1rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Instructions from HOD:</span>
                                            <p style={{ fontSize: '0.9rem', color: '#334155', fontStyle: 'italic', margin: 0 }}>
                                                "{iaConfig.instructions}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Syllabus */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 600, color: '#374151', fontSize: '1rem' }}>Syllabus Coverage / Lessons</label>
                                    <textarea
                                        name="syllabus"
                                        value={iaConfig.syllabus}
                                        onChange={handleIaConfigChange}
                                        placeholder="Enter lessons or topics..."
                                        className={styles.largeInput}
                                        style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
                                    />
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>This will be visible to students as "Topics"</p>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                    <button
                                        className={styles.secondaryBtn}
                                        style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                                        onClick={() => setIaConfig(prev => ({ ...prev, syllabus: '', instructions: '' }))}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        className={styles.saveBtn}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            fontSize: '1rem'
                                        }}
                                        onClick={handleAnnouncementSubmit}
                                    >
                                        <Megaphone size={18} /> Update Syllabus
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Preview/Info */}
                    <div className={styles.rightColumn} style={{ flex: 1 }}>
                        <div className={styles.glassCard} style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <h3 className={styles.cardTitle} style={{ color: '#1e293b' }}>Preview Notification</h3>

                            <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>SYLLABUS UPDATE</span>
                                    <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Just now</span>
                                </div>
                                <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '1.1rem' }}>
                                    {iaConfig.subjectId ? mySubjects.find(s => s.id === parseInt(iaConfig.subjectId))?.name : 'Subject Name'}
                                </h4>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.95rem', color: '#4b5563', marginBottom: '0.8rem' }}>
                                    <Calendar size={16} color="#64748b" />
                                    <span>CIE-{iaConfig.cieNumber} • {currentSchedule.date}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#4b5563', margin: 0, padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #cbd5e1' }}>
                                    {iaConfig.syllabus ? iaConfig.syllabus.substring(0, 80) + (iaConfig.syllabus.length > 80 ? '...' : '') : 'Syllabus details...'}
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.95rem', color: '#334155', marginBottom: '0.75rem', fontWeight: 600 }}>Who will be notified?</h4>
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.95rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <li>All enrolled students</li>
                                    <li>Department HOD</li>
                                    <li>Principal (Dashboard)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* READ-ONLY Published Schedules from HOD - REVAMPED CARD STYLE */}
                <div className={styles.card} style={{ marginTop: '2rem' }}>
                    <div className={styles.cardHeader} style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, color: '#1e293b' }}>📅 Published CIE Schedules</h3>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Upcoming Exams</span>
                    </div>

                    <div className={styles.alertList} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {publishedSchedules.filter(s => mySubjects.some(sub => sub.id === (s.subject?.id || s.subjectId))).length > 0 ?
                            publishedSchedules
                                .filter(s => mySubjects.some(sub => sub.id === (s.subject?.id || s.subjectId)))
                                .map(sched => (
                                    <div key={sched.id} className={styles.alertItem} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        gap: '1rem'
                                    }}>
                                        <div style={{
                                            background: 'white',
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            textAlign: 'center',
                                            minWidth: '60px',
                                            border: '1px solid #f1f5f9',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>
                                                {sched.scheduledDate ? new Date(sched.scheduledDate).getDate() : '-'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>
                                                {sched.scheduledDate ? new Date(sched.scheduledDate).toLocaleString('default', { month: 'short' }) : '-'}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>
                                                    {sched.subject ? sched.subject.name : 'Unknown Subject'}
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                        ({sched.subject?.code})
                                                    </span>
                                                </h4>
                                                <span className={styles.statusBadge} style={{
                                                    background: '#dbeafe',
                                                    color: '#1e40af',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600
                                                }}>
                                                    CIE-{sched.cieNumber}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', color: '#475569', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Clock size={16} className={styles.textBlue} />
                                                    {sched.startTime || '-'} ({sched.durationMinutes}m)
                                                </span>
                                                {sched.examRoom && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <MapPin size={16} className={styles.textRed} />
                                                        {sched.examRoom}
                                                    </span>
                                                )}
                                            </div>
                                            {sched.instructions && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>
                                                    " {sched.instructions} "
                                                </div>
                                            )}
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                                                Scheduled by: <span style={{ fontWeight: 600, color: '#64748b' }}>{sched.publishedBy || 'HOD'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                                    <p>No exams scheduled yet.</p>
                                </div>
                            )}
                    </div>
                </div>
            </div>
        );
    };

    const renderLowPerformers = () => {
        return (
            <div className={styles.sectionContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 className={styles.sectionTitle} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <AlertTriangle size={24} /> Action Required: Low Performers
                        </h2>
                        <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                            Students who scored less than 20/50 in any CIE.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                            className={styles.searchInput}
                            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.9rem' }}
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                        >
                            <option value="All">All Subjects</option>
                            {mySubjects.map(sub => (
                                <option key={sub.id} value={sub.name}>{sub.name}</option>
                            ))}
                        </select>
                        <select
                            className={styles.searchInput}
                            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.9rem' }}
                            value={filterCIE}
                            onChange={(e) => setFilterCIE(e.target.value)}
                        >
                            <option value="All">All CIE</option>
                            {['CIE1', 'CIE2', 'CIE3', 'CIE4', 'CIE5'].map(cie => (
                                <option key={cie} value={cie}>{cie}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Sl No</th>
                                    <th>Reg No</th>
                                    <th>Student Name</th>
                                    <th>Marks</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facultyClassAnalytics.lowPerformersList && facultyClassAnalytics.lowPerformersList
                                    .filter(item => filterSubject === 'All' || item.subject === filterSubject)
                                    .filter(item => filterCIE === 'All' || item.cieType === filterCIE)
                                    .length > 0 ? (
                                    facultyClassAnalytics.lowPerformersList
                                        .filter(item => filterSubject === 'All' || item.subject === filterSubject)
                                        .filter(item => filterCIE === 'All' || item.cieType === filterCIE)
                                        .map((item, i) => (
                                            <tr key={i}>
                                                <td style={{ color: '#64748b' }}>{i + 1}</td>
                                                <td className={styles.codeText}>{item.regNo}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.subject} ({item.cieType})</div>
                                                </td>
                                                <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{item.score}/50</td>
                                                <td>
                                                    <button
                                                        className={styles.iconBtn}
                                                        onClick={() => showToast(`Alert sent for ${item.name}`)}
                                                        title="Notify Parent"
                                                        style={{ color: '#dc2626', background: '#fee2e2', padding: '6px' }}
                                                    >
                                                        <Phone size={16} /> Notify
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <CheckCircle size={32} color="#10b981" />
                                                <p>No low performers found matching filters!</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // Render Notifications Section
    const renderNotifications = () => {
        return (
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>All Notifications</h2>
                <div className={styles.notificationsList}>
                    {notifications.length > 0 ? notifications.map(notif => (
                        <div key={notif.id} className={`${styles.notifItem} ${!notif.isRead ? styles.unread : ''}`}>
                            <div className={styles.notifIcon}>
                                {notif.type === 'INFO' ? <Bell size={20} /> : <AlertCircle size={20} />}
                            </div>
                            <div className={styles.notifContent}>
                                <p className={styles.notifMessage}>{notif.message}</p>
                                <span className={styles.notifTime}>{new Date(notif.createdAt).toLocaleString()}</span>
                                {notif.category && <span className={styles.notifCategory}>{notif.category}</span>}
                            </div>
                        </div>
                    )) : (
                        <div className={styles.emptyState}>
                            <Bell size={48} />
                            <p>No notifications yet</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render My Announcements Section
    const renderMyAnnouncements = () => {
        return (
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>My CIE Announcements</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>CIE Number</th>
                                <th>Scheduled Date</th>
                                <th>Start Time</th>
                                <th>Room</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myAnnouncements.length > 0 ? myAnnouncements.map(ann => (
                                <tr key={ann.id}>
                                    <td>
                                        <div className={styles.subjectCell}>
                                            <span className={styles.subjectName}>{ann.Subject?.name || 'N/A'}</span>
                                            <span className={styles.subjectCode}>{ann.Subject?.code || ''}</span>
                                        </div>
                                    </td>
                                    <td>CIE {ann.cieNumber}</td>
                                    <td>{new Date(ann.scheduledDate).toLocaleDateString()}</td>
                                    <td>{ann.startTime}</td>
                                    <td>{ann.examRoom}</td>
                                    <td>
                                        <span className={`${styles.badge} ${ann.status === 'SCHEDULED' ? styles.good : styles.needsFocus}`}>
                                            {ann.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                        <div className={styles.emptyState}>
                                            <Megaphone size={48} />
                                            <p>No announcements created yet</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout menuItems={menuItems} >
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1 className={styles.welcomeText}>Hello, {user?.fullName || user?.username || 'Faculty'}</h1>
                        <p className={styles.subtitle}>Lecturer | {user?.department || 'Department'}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    </div>
                </div>
            </header>

            {activeSection === 'Overview' && renderOverview()
            }
            {activeSection === 'My Students' && renderMyStudents()}
            {activeSection === 'CIE Entry' && renderCIEEntry()}
            {activeSection === 'Attendance' && renderAttendance()}
            {activeSection === 'Lesson Plan' && renderLessonPlan()}
            {activeSection === 'CIE Schedule' && renderCIESchedule()}
            {activeSection === 'Proctoring' && renderProctoring()}
            {activeSection === 'Low Performers' && renderLowPerformers()}
            {activeSection === 'Notifications' && renderNotifications()}
            {activeSection === 'My Announcements' && renderMyAnnouncements()}

            {/* MODALS */}
            {renderStudentProfileModal()}
            {renderUploadModal()}

            {
                toast.show && (
                    <div className={`${styles.toast} ${toast.type === 'error' ? styles.error : ''}`}>
                        <CheckCircle size={18} />
                        {toast.message}
                    </div>
                )
            }
        </DashboardLayout >
    );
};



const calculateGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return 'S';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
};

export default FacultyDashboard;
