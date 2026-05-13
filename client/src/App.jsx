import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import { FactoryList } from './pages/Factories';
import FactoryForm from './components/Factories/FactoryForm';
import FactoryDetailView from './components/Factories/FactoryDetailView';
import ProcessesPage from './pages/Processes';
import { WorkList } from './pages/Works';
import WorkForm from './components/Works/WorkForm';
import WorkDetailView from './components/WorkDetailView';
import { MachineList } from './pages/Machines';
import MachineForm from './components/Machines/MachineForm';
import MachineDetailView from './components/MachineDetailView';
import { PartList } from './pages/Parts';
import PartForm from './components/Parts/PartForm';
import PartDetailView from './components/PartDetailView';
import ListWithLayerPopup from './components/ListWithLayerPopup';
import PlanPage from './pages/Plans';
import SimulationsPage from './pages/Simulations';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<div className="p-4">대시보드 (홈)</div>} />
        <Route
          path="factories/*"
          element={
            <ListWithLayerPopup
              basePath="factories"
              ListComponent={FactoryList}
              FormComponent={FactoryForm}
              DetailComponent={FactoryDetailView}
              titleAdd="공장 등록"
              titleView="공장 보기"
              titleEdit="공장 수정"
            />
          }
        />
        <Route path="processes/*" element={<ProcessesPage />} />
        <Route
          path="works/*"
          element={
            <ListWithLayerPopup
              basePath="works"
              ListComponent={WorkList}
              FormComponent={WorkForm}
              DetailComponent={WorkDetailView}
              titleAdd="작업 등록"
              titleView="작업 보기"
              titleEdit="작업 수정"
            />
          }
        />
        <Route
          path="machines/*"
          element={
            <ListWithLayerPopup
              basePath="machines"
              ListComponent={MachineList}
              FormComponent={MachineForm}
              DetailComponent={MachineDetailView}
              titleAdd="기계 등록"
              titleView="기계 보기"
              titleEdit="기계 수정"
            />
          }
        />
        <Route
          path="parts/*"
          element={
            <ListWithLayerPopup
              basePath="parts"
              ListComponent={PartList}
              FormComponent={PartForm}
              DetailComponent={PartDetailView}
              titleAdd="부품 등록"
              titleView="부품 보기"
              titleEdit="부품 수정"
            />
          }
        />
        <Route path="plan/*" element={<PlanPage />} />
        <Route path="simulations/*" element={<SimulationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
