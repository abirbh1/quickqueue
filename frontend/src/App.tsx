import { Route, Routes } from 'react-router-dom'
import CheckInPage from './pages/CheckInPage'
import ManagerPage from './pages/ManagerPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ManagerPage />} />
      <Route path="/checkin" element={<CheckInPage />} />
    </Routes>
  )
}
