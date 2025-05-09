import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/Home"; // Ana sayfa (ikon seçimi)
import Requests from "./components/Requests"; // İstekler listesi
import CravingTracker from "./components/CravingTracker"; // Yeni takip sayfası
import Carpet from "./components/Carpet/Carpet.js"; // Halı saha sayfası

const App = () => {
    return (
        <Router>
            <Routes>
                {/* Ana sayfa artık ikon seçim ekranı */}
                <Route path="/" element={<Home />} />

                {/* Sigara ikonuna tıklandığında gidilecek sayfa */}
                <Route path="/craving-tracker" element={<CravingTracker />} />

                {/* İsteklerin listelendiği sayfa */}
                <Route path="/requests" element={<Requests />} />

                {/* Halı Saha */}
                <Route path="/carpet" element={<Carpet />} />
            </Routes>
        </Router>
    );
};

export default App;