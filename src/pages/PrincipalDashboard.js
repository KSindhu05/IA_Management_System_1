import React, { useState, useMemo, useCallback, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import styles from './PrincipalDashboard.module.css';
import {
    LayoutDashboard, Users, ShieldCheck, Calendar, BarChart2,
    Briefcase, Bell, AlertTriangle, FileText, Building, LogOut
} from 'lucide-react';
import headerLogo from '../assets/header_logo.png';

// Import Extracted Components
import { ToastNotification, SimpleModal } from '../components/dashboard/principal/Shared';
import { StudentSentinel } from '../components/dashboard/principal/Widgets';
import OverviewSection from '../components/dashboard/principal/OverviewSection';
import ComplianceSection from '../components/dashboard/principal/ComplianceSection';
import DepartmentSection from '../components/dashboard/principal/DepartmentSection';
// import FacultySection from '../components/dashboard/principal/FacultySection'; // Replaced by FacultyDirectorySection
import { DirectorySection } from '../components/dashboard/principal/DirectorySection';
import {
    FacultyDirectorySection, TimetablesSection, CircularsSection,
    ReportsSection, GrievancesSection
} from '../components/dashboard/principal/SectionComponents';

import {
    fetchPrincipalDashboard, fetchAllFaculty, fetchTimetables,
    fetchCirculars, fetchReports, fetchGrievances
} from '../services/api';

const PrincipalDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // Data States
    const [dashboardData, setDashboardData] = useState(null);
    const [facultyList, setFacultyList] = useState([]);
    const [timetables, setTimetables] = useState([]);
    const [circulars, setCirculars] = useState([]);
    const [reports, setReports] = useState([]);
    const [grievances, setGrievances] = useState([]);

    const [loading, setLoading] = useState(true);

    // Directory State
    const [selectedDept, setSelectedDept] = useState(null);
    const [deptStudents, setDeptStudents] = useState([]);

    // Interaction State
    const [toast, setToast] = useState({ show: false, msg: '', type: 'info' });
    const [activeModal, setActiveModal] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    // Fetch All Data
    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const token = user?.token;
                setLoading(true);

                // Parallel fetching of all required data
                const [
                    dashData,
                    faculty,
                    times,
                    circs,
                    reps,
                    grievs
                ] = await Promise.all([
                    fetchPrincipalDashboard(token),
                    fetchAllFaculty(token),
                    fetchTimetables(token),
                    fetchCirculars(token),
                    fetchReports(token),
                    fetchGrievances(token)
                ]);

                if (dashData) setDashboardData(dashData);
                if (faculty) setFacultyList(faculty);
                if (times) setTimetables(times);
                if (circs) setCirculars(circs);
                if (reps) setReports(reps);
                if (grievs) setGrievances(grievs);

            } catch (error) {
                console.error("Failed to load dashboard data", error);
                showToast("Failed to load live data", "error");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const showToast = useCallback((msg, type = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: '', type: 'info' }), 3000);
    }, []);

    const handleDownload = useCallback((item) => showToast(`Downloading ${item.name || 'document'}...`, 'info'), [showToast]);
    const handleNewBroadcast = useCallback(() => setActiveModal('broadcast'), []);
    const handleSaveFaculty = useCallback((e) => { e.preventDefault(); setActiveModal(null); showToast('Faculty Saved', 'success'); }, [showToast]);

    // MENU ITEMS - format compatible with Sidebar component
    const menuItems = [
        { label: 'Overview', path: '#overview', icon: <LayoutDashboard size={20} />, isActive: activeTab === 'overview', onClick: () => setActiveTab('overview') },
        { label: 'Departments', path: '#departments', icon: <Building size={20} />, isActive: activeTab === 'departments', onClick: () => setActiveTab('departments') },
        { label: 'Faculty Directory', path: '#faculty', icon: <Briefcase size={20} />, isActive: activeTab === 'faculty', onClick: () => setActiveTab('faculty') },
        { label: 'Student Search', path: '#directory', icon: <Users size={20} />, isActive: activeTab === 'directory', onClick: () => { setActiveTab('directory'); setSelectedDept(null); } },
        { label: 'Time Tables', path: '#timetables', icon: <Calendar size={20} />, isActive: activeTab === 'timetables', onClick: () => setActiveTab('timetables') },
        { label: 'CIE Compliance', path: '#compliance', icon: <ShieldCheck size={20} />, isActive: activeTab === 'compliance', onClick: () => setActiveTab('compliance') },
        { label: 'Reports & Analytics', path: '#reports', icon: <FileText size={20} />, isActive: activeTab === 'reports', onClick: () => setActiveTab('reports') },
        { label: 'Circulars', path: '#circulars', icon: <Bell size={20} />, isActive: activeTab === 'circulars', onClick: () => setActiveTab('circulars') },
        { label: 'Grievances', path: '#grievances', icon: <AlertTriangle size={20} />, isActive: activeTab === 'grievances', onClick: () => setActiveTab('grievances') }
    ];

    /* Chart Configs and Helper Logic */
    const barData = useMemo(() => {
        if (!dashboardData) return null;
        return {
            labels: dashboardData.branches || ['CS', 'EC', 'ME', 'CV'],
            datasets: [{
                label: 'Avg CIE Performance (%)',
                data: dashboardData.branchPerformance || [0, 0, 0, 0],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                borderRadius: 6
            }]
        };
    }, [dashboardData]);

    const departments = useMemo(() => {
        if (!dashboardData?.branches) return [];
        return dashboardData.branches.map(branch => {
            const hodInfo = dashboardData.hodSubmissionStatus?.find(h => h.dept === branch);
            return {
                id: branch,
                name: branch === 'CS' ? 'Computer Science' : branch === 'ME' ? 'Mechanical' : branch === 'EC' ? 'Electronics' : branch === 'CV' ? 'Civil' : branch,
                hod: hodInfo ? hodInfo.hod : 'Unknown',
                color: branch === 'CS' ? '#3b82f6' : branch === 'ME' ? '#f59e0b' : branch === 'EC' ? '#8b5cf6' : '#10b981'
            };
        });
    }, [dashboardData]);

    const handleDeptClick = useCallback((dept) => {
        setSelectedDept(dept);
        // Students are fetched by DirectorySection internally based on selectedDept
        setDeptStudents([]);
    }, []);

    const handleAddFaculty = useCallback(() => setActiveModal('faculty'), []);

    // const handleViewGrievance = useCallback((g) => {
    //     setSelectedItem(g);
    //     setActiveModal('grievance');
    // }, []);

    const handleLogout = () => {
        logout();
    };

    return (
        <DashboardLayout menuItems={menuItems}>
            {/* --- HEADER (Faculty-style) --- */}
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1 className={styles.welcomeText}>Hello, Dr. Gowri Shankar</h1>
                        <p className={styles.subtitle}>Principal | Sanjay Gandhi Polytechnic</p>
                    </div>
                    <div className={styles.headerActions}>
                        <StudentSentinel students={deptStudents} />
                        <select className={styles.yearSelector}>
                            <option>Academic Year 2025-26</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* Dynamic Content */}
            <div className={styles.sectionVisible}>
                {activeTab === 'overview' && (
                    loading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading Dashboard...</div> :
                        <OverviewSection
                            stats={dashboardData?.stats}
                            chartData={barData}
                            branches={dashboardData?.branches}
                            branchPerformance={dashboardData?.branchPerformance}
                            lowPerformers={dashboardData?.lowPerformers}
                            facultyAnalytics={dashboardData?.facultyAnalytics}
                            schedule={dashboardData?.dates}
                            approvals={dashboardData?.approvals}
                            cieStats={dashboardData?.cieStats}
                            trends={dashboardData?.trends}
                            hodSubmissionStatus={dashboardData?.hodSubmissionStatus}
                        />
                )}

                {activeTab === 'compliance' && <ComplianceSection hodSubmissionStatus={dashboardData?.hodSubmissionStatus} />}

                {activeTab === 'departments' && <DepartmentSection departments={departments} />}

                {activeTab === 'directory' && <DirectorySection
                    departments={departments}
                    selectedDept={selectedDept}
                    deptStudents={deptStudents}
                    handleDeptClick={handleDeptClick}
                    setSelectedDept={setSelectedDept}
                />}

                {activeTab === 'faculty' && <FacultyDirectorySection facultyMembers={facultyList} onAdd={handleAddFaculty} />}

                {activeTab === 'timetables' && <TimetablesSection timetables={timetables} onDownload={handleDownload} />}
                {activeTab === 'circulars' && <CircularsSection circulars={circulars} onNewBroadcast={handleNewBroadcast} />}
                {activeTab === 'reports' && <ReportsSection reports={reports} onDownload={handleDownload} />}
                {activeTab === 'grievances' && <GrievancesSection grievances={grievances} onView={() => { }} />}
            </div>

            {/* Interaction Modals */}
            <ToastNotification show={toast.show} msg={toast.msg} type={toast.type} />

            <SimpleModal isOpen={activeModal === 'faculty'} onClose={() => setActiveModal(null)} title="Add New Faculty">
                <form onSubmit={handleSaveFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input className={styles.searchBarInput} placeholder="Full Name" required style={{ border: '1px solid #e2e8f0' }} />
                    <select className={styles.searchBarInput} style={{ border: '1px solid #e2e8f0' }}>
                        <option>Computer Science</option>
                        <option>Mechanical</option>
                        <option>Civil</option>
                        <option>Electronics</option>
                    </select>
                    <button type="submit" className={styles.primaryBtn} style={{ marginTop: '0.5rem', justifyContent: 'center' }}>Save Faculty</button>
                </form>
            </SimpleModal>
        </DashboardLayout>
    );
};

export default PrincipalDashboard;
