import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import { ClientScenarios } from './pages/ClientScenarios'
import { DataAssumptions } from './pages/DataAssumptions'
import { Login } from './pages/Login'
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/clients" element={<ClientScenarios />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/data" element={<DataAssumptions />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}