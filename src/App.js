import logo from './logo.svg';
import './App.css';
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Header from "../src/Header/Header";
import HomePage from '../src/HomePage/HomePage';
import Retro from "./Retro/RetroPage";
import Modern from "./Modern/ModernPage";
import Header from "./Header/Header";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <div className="App">
    
        <Router>
      
        <Routes>
          <Route path = "/" element = {<HomePage/>}/>
          <Route path="/Retro" element={<Retro />} />
          <Route path="/Modern" element={<Modern />} />
        </Routes>
      </Router>
      

    </div>
  );
}

export default App;
