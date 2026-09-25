import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LocationProvider } from './context/LocationContext';
import { CivicDataProvider } from './context/CivicDataContext';
import { MapLayersProvider } from './context/MapLayersContext';

// Pages
import { Overview } from './pages/Overview';
import { LiveCity } from './pages/LiveCity';
import { DigitalTwin } from './pages/DigitalTwin';
import { RiskIntelligence } from './pages/RiskIntelligence';
import { ReportIssue } from './pages/ReportIssue';
import { ScenarioLab } from './pages/ScenarioLab';
import { CityReplay } from './pages/CityReplay';
import { AskCityPulse } from './pages/AskCityPulse';
import { MunicipalCommand } from './pages/MunicipalCommand';
import { CityNews } from './pages/CityNews';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <LocationProvider>
        <CivicDataProvider>
          <MapLayersProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route index element={<Overview />} />
                  <Route path="live-city" element={<LiveCity />} />
                  <Route path="digital-twin" element={<DigitalTwin />} />
                  <Route path="risk-intelligence" element={<RiskIntelligence />} />
                  <Route path="report-issue" element={<ReportIssue />} />
                  <Route path="scenario-lab" element={<ScenarioLab />} />
                  <Route path="city-replay" element={<CityReplay />} />
                  <Route path="ask-citypulse" element={<AskCityPulse />} />
                  <Route path="municipal-command" element={<MunicipalCommand />} />
                  <Route path="city-news" element={<CityNews />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </MapLayersProvider>
        </CivicDataProvider>
      </LocationProvider>
    </ErrorBoundary>
  );
};

export default App;
