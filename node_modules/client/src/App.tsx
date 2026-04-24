import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ScreeningPage } from './pages/ScreeningPage';
import { ResultsPage } from './pages/ResultsPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { BatchEditPage } from './pages/BatchEditPage';
import { GalleryPage } from './pages/GalleryPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="screening" element={<ScreeningPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="batch-edit" element={<BatchEditPage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
