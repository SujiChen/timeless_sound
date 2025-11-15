import React from 'react';
import './Header.css';
import { Link } from "react-router-dom";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


export default function Header() {
    return(
        <div className="header">
                <className className="top">
                    <Link to="/" className="name" >Timeless Sound</Link>
                    
                    {/* <div className="logo">
                        <div> <Card url="https://github.com/yourusername" title="" IconComponent={FaGithub} hover={false} /></div>

                        <div> <Card url="https://github.com/yourusername" title="" IconComponent={FaLinkedin} hover={false} /></div>
                    </div> */}

                </className>


            {/* <nav className="nav">
                <ul>
                <li><Link to="/" className="nav-link">Home</Link></li>
                <li><Link to="/projects" className="nav-link">Projects</Link></li>
                <li><Link to="/about" className="nav-link">About</Link></li>
                <li><Link to="/contact" className="nav-link">Contact</Link></li>
                </ul>
            </nav> */}

            
        </div>
    )

}