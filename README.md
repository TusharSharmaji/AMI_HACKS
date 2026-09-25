# CityPulse — Urban Intelligence & Civic Operating System

CityPulse is a next-generation real-time civic intelligence and urban digital twin platform designed for municipal command centers, urban planners, and citizens.

![CityPulse Platform](public/favicon.svg)

---

## 🌟 Key Features

- **Civic Risk Intelligence Engine**: Real-time multi-dimensional risk scoring (Traffic, Environmental/AQI, Weather, Civic Incidents) with transparent explainability and actionable mitigation checklists.
- **3D Digital Twin (CesiumJS)**: High-fidelity 3D photorealistic visualization with Cesium OSM Buildings, interactive city navigation, altitude/pitch camera controls, and 3D geospatial overlays.
- **Live 2D Interactive Map (MapLibre GL JS)**: Fast vector map engine with customizable layers:
  - TomTom live traffic flow tiles & incidents
  - Open-Meteo weather stations & air quality index heatmaps
  - OpenStreetMap (OSM) Points of Interest (Hospitals, Fire Stations, Police, Schools)
  - Live citizen incident reports
- **Scenario Lab (What-If Urban Simulator)**: Simulate environmental shocks, severe weather events, traffic gridlock, and emergency facility outages with real-time civic impact projections.
- **City Replay (Historical Timeline)**: Scrub through historical city telemetry and replay past civic anomalies to analyze cause-and-effect patterns.
- **AI Municipal Assistant (Google Gemini)**: Natural language querying across city datasets, anomaly triage, and automated citizen inquiry resolution.
- **Municipal Command Center**: Department triage queue (Roads, Waste, Water, Power, Transit, Public Safety), live status dispatch, and emergency broadcast dispatch.
- **Citizen Report Portal**: Multi-step report filing with GPS geocoding, photo attachment simulation, and severity classification.
- **Global Theme Engine**: Seamless dark/light mode toggle with coordinated MapLibre tile styles and CSS design tokens.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, CSS custom properties / design tokens, Lucide Icons, Framer Motion
- **Maps & 3D Geospatial**:
  - [MapLibre GL JS](https://maplibre.org/)
  - [CesiumJS](https://cesium.com/platform/cesiumjs/)
- **Live Data Feeds & APIs**:
  - [Open-Meteo](https://open-meteo.com/) — Real-time weather & Air Quality Index (AQI)
  - [TomTom Traffic & Geocoding API](https://developer.tomtom.com/) — Traffic density, incidents & location search
  - [OpenStreetMap / Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) — Real-world civic infrastructure POIs
  - [Google Gemini API](https://ai.google.dev/) — Generative civic intelligence & assistant

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/TusharSharmaji/AMI_HACKS.git
   cd AMI_HACKS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and provide your API keys:
   ```env
   VITE_TOMTOM_API_KEY=your_tomtom_api_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_CESIUM_ION_ACCESS_TOKEN=your_cesium_ion_token_here
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## ☁️ Deployment on Vercel

1. Push your code to GitHub:
   ```bash
   git push origin main
   ```
2. Import the project in [Vercel](https://vercel.com/new).
3. The build settings are pre-configured via `vercel.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In the Vercel Dashboard, go to **Settings > Environment Variables** and add:
   - `VITE_TOMTOM_API_KEY`
   - `VITE_GEMINI_API_KEY`
   - `VITE_CESIUM_ION_ACCESS_TOKEN`
5. Click **Deploy**.

---

## 📄 License

MIT License — see LICENSE for details.