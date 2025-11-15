import logo from './logo.svg';
import './App.css';
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Header from "../src/Header/Header";
import HomePage from '../src/HomePage/HomePage';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <div className="App">
      hiii
     
        <Router>
       

        <Routes>
          <Route path = "/" element = {<HomePage/>}/>
      
        </Routes>
      </Router>
      

    </div>
  );
}

export default App;
