import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Requests from "./components/Requests";

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/requests" element={<Requests />} />
            </Routes>
        </Router>
    );
};

export default App;
