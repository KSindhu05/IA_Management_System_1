import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';
import { User, Lock, ArrowRight, Moon, Sun } from 'lucide-react';

// Import background images
import bg1 from '../assets/login_background_final.png';
import bg2 from '../assets/slideshow_1.png';
import bg3 from '../assets/slideshow_2.png';
import bg4 from '../assets/slideshow_3.png';
import headerLogo from '../assets/header_logo.png';
import collegeLogo from '../assets/college1_logo.png';

const backgroundImages = [bg1, bg2, bg3, bg4];

const Login = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [typedText, setTypedText] = useState('');
    const [isStarted, setIsStarted] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const cardRef = useRef(null);

    // Typewriter Content
    const typeWriterStrings = [
        "IA Management System for Diploma Education",
        "Track Internal Assessment Marks",
        "Monitor Attendance & Academic Performance",
        "Role-Based Access for Students and Faculty"
    ];

    // Initialize Theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDarkMode(true);
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggleTheme = () => {
        setIsDarkMode(prev => {
            const newMode = !prev;
            document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
            localStorage.setItem('theme', newMode ? 'dark' : 'light');
            return newMode;
        });
    };

    // Slideshow Effect
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % backgroundImages.length);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Typewriter Effect
    useEffect(() => {
        let stringIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        const type = () => {
            const currentString = typeWriterStrings[stringIndex];

            if (isDeleting) {
                setTypedText(currentString.substring(0, charIndex - 1));
                charIndex--;
            } else {
                setTypedText(currentString.substring(0, charIndex + 1));
                charIndex++;
            }

            if (!isDeleting && charIndex === currentString.length) {
                setTimeout(() => isDeleting = true, 2000); // Pause at end
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                stringIndex = (stringIndex + 1) % typeWriterStrings.length;
            }
        };

        const timer = setInterval(type, isDeleting ? 30 : 60);
        return () => clearInterval(timer);
    }, []);

    // 3D Tilt Effect
    const handleMouseMove = (e) => {
        if (!cardRef.current || window.innerWidth <= 900) return;

        const { left, top, width, height } = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - left - width / 2) / 30;
        const y = (e.clientY - top - height / 2) / 30;

        cardRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
    };

    const handleMouseLeave = () => {
        if (cardRef.current) {
            cardRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        await new Promise(r => setTimeout(r, 800));

        try {
            const result = await login(userId, password);

            if (result.success) {
                const role = result.role;
                if (role === 'student') navigate('/dashboard/student');
                else if (role === 'faculty') navigate('/dashboard/faculty');
                else if (role === 'hod') navigate('/dashboard/hod');
                else if (role === 'principal') navigate('/dashboard/principal');
                else navigate('/');
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Unexpected error: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Background Slideshow */}
            <div className={styles.slideshowContainer}>
                <div
                    className={styles.slideshow}
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                    {backgroundImages.map((bg, index) => (
                        <div
                            key={index}
                            className={styles.slide}
                            style={{ backgroundImage: `url(${bg})` }}
                        />
                    ))}
                </div>
            </div>

            {/* Dark Overlay */}
            <div className={styles.overlay}></div>

            {/* Theme Toggle Removed */}

            {/* Background Particles */}
            <div className={styles.particlesContainer}>
                <div className={styles.particle}></div>
                <div className={styles.particle}></div>
                <div className={styles.particle}></div>
                <div className={styles.particle}></div>
                <div className={styles.particle}></div>
            </div>

            {/* TOP HEADER - Logo + Text */}
            <div className={styles.topHeader}>
                <img src={collegeLogo} alt="SGP Logo" className={styles.brandLogo} />
                <h1 className={styles.collegeName}>
                    <span className={styles.whiteText}>SANJAY GANDHI POLYTECHNIC</span>
                </h1>
            </div>

            {/* Team Member Ticker */}
            <div className={styles.tickerContainer}>
                <div className={styles.tickerContent}>
                    This project IA MANAGEMENT SYSTEM has been done by K Sindhu, M Priyanka, V Akshaya, Amrutha, Gouthami, Chandana, Arshiya, Tasmiya
                </div>
            </div>

            <div className={styles.contentWrapper}>
                {/* Left Side - Animated Text */}
                {/* Left Side - Image Illustration */}
                <div className={styles.leftContent}>
                    <div className={styles.systemTitle}>
                        <span className={styles.iaText}>IA</span>
                        <span className={styles.managementText}>MANAGEMENT SYSTEM</span>
                    </div>

                    <div className={styles.typewriterWrapper}>
                        <p className={styles.typewriterText}>
                            {typedText}<span className={styles.cursor}>|</span>
                        </p>
                    </div>

                    {!isStarted && (
                        <button
                            className={styles.getStartedButton}
                            onClick={() => setIsStarted(true)}
                        >
                            Get Started <ArrowRight size={20} />
                        </button>
                    )}
                </div>

                {/* Right Side - Login Card (Slide in when isStarted is true) */}
                <div
                    className={`${styles.rightContent} ${isStarted ? styles.showLogin : ''}`}
                >
                    {isStarted && (
                        <div className={styles.loginCard}>
                            <div className={styles.header}>
                                <img src={headerLogo} alt="College Logo" className={styles.formLogo} />
                                <h2 className={styles.loginTitle}>Welcome Back!</h2>
                                <p className={styles.subtitle}>Sign in to continue</p>
                            </div>

                            <form onSubmit={handleSubmit} className={styles.form}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="userId">User ID</label>
                                    <div className={styles.inputWrapper}>
                                        <User className={styles.icon} size={20} />
                                        <input
                                            type="text"
                                            id="userId"
                                            placeholder="Enter UserID"
                                            value={userId}
                                            onChange={(e) => setUserId(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="password">Password</label>
                                    <div className={styles.inputWrapper}>
                                        <Lock className={styles.icon} size={20} />
                                        <input
                                            type="password"
                                            id="password"
                                            placeholder="Enter Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {error && <div className={styles.error}>{error}</div>}

                                <button type="submit" className={styles.loginButton} disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <div className={styles.spinner}></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Login <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Role Icons */}
                            <div className={styles.rolesSection}>
                                <p className={styles.rolesTitle}>Single login system with role-based dashboards</p>
                                <div className={styles.roleIcons}>
                                    <div className={styles.roleItem} title="Student">🎓 <span>Student</span></div>
                                    <div className={styles.roleItem} title="Faculty">👨‍🏫 <span>Faculty</span></div>
                                    <div className={styles.roleItem} title="HOD">🧑‍💼 <span>HOD</span></div>
                                    <div className={styles.roleItem} title="Principal">👨‍💼 <span>Principal</span></div>
                                </div>
                            </div>

                            <div className={styles.footer}>
                                <div className={styles.securityNote}>
                                    🔒 Secure Role-Based Authentication
                                </div>
                                <div className={styles.copyRight}>
                                    © 2026 Sanjay Gandhi Polytechnic | IA Management System
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dots */}
            <div className={styles.dotsContainer}>
                {backgroundImages.map((_, idx) => (
                    <div
                        key={idx}
                        className={`${styles.dot} ${currentSlide === idx ? styles.dotActive : ''}`}
                        onClick={() => setCurrentSlide(idx)}
                    />
                ))}
            </div>
        </div >
    );
};

export default Login;