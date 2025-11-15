import React from 'react';
import './Header.css';
import { Link } from "react-router-dom";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


export default function Header() {
    return(
        <div className="header">
            <div className="top">
                <Link to="/" className="name">Timeless Sound</Link>

                <nav className="nav">
                    <ul>
                        <li><Link to="/Retro" className="nav-link">Retros</Link></li>
                        <li><Link to="/Modern" className="nav-link">Modern</Link></li>
                    </ul>
                </nav>

                <div className="logo">
                    <div>Listen</div>
                </div>
            </div>
        </div>
    )
}
