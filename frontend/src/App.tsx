import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./app/AppShell";
import { HomeRoute } from "./routes/home/HomeRoute";

const SkyRoute = lazy(() => import("./routes/sky/SkyRoute").then((m) => ({ default: m.SkyRoute })));
const ThreatsRoute = lazy(() => import("./routes/threats/ThreatsRoute").then((m) => ({ default: m.ThreatsRoute })));
const ThreatDetailRoute = lazy(() =>
  import("./routes/threats/ThreatDetailRoute").then((m) => ({ default: m.ThreatDetailRoute }))
);
const AvoidanceRoute = lazy(() => import("./routes/avoidance/AvoidanceRoute").then((m) => ({ default: m.AvoidanceRoute })));
const ReportRoute = lazy(() => import("./routes/report/ReportRoute").then((m) => ({ default: m.ReportRoute })));
const LearnRoute = lazy(() => import("./routes/learn/LearnRoute").then((m) => ({ default: m.LearnRoute })));
const SystemRoute = lazy(() => import("./routes/system/SystemRoute").then((m) => ({ default: m.SystemRoute })));
const StyleguideRoute = lazy(() =>
  import("./routes/styleguide/StyleguideRoute").then((m) => ({ default: m.StyleguideRoute }))
);

function RouteFallback() {
  return <div aria-busy="true" aria-live="polite" className="min-h-[60vh]" />;
}

function AnimatedRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<HomeRoute />} path="/" />
        <Route element={<SkyRoute />} path="/sky" />
        <Route element={<ThreatsRoute />} path="/threats" />
        <Route element={<ThreatDetailRoute />} path="/threats/:id" />
        <Route element={<AvoidanceRoute />} path="/avoidance" />
        <Route element={<ReportRoute />} path="/report" />
        <Route element={<LearnRoute />} path="/learn" />
        <Route element={<SystemRoute />} path="/system" />
        <Route element={<StyleguideRoute />} path="/styleguide" />

        {/* Legacy redirects keep old links alive (doc 03 §2). */}
        <Route element={<Navigate replace to="/sky" />} path="/mission" />
        <Route element={<Navigate replace to="/sky" />} path="/mission-control" />
        <Route element={<Navigate replace to="/sky" />} path="/catalog" />
        <Route element={<Navigate replace to="/threats" />} path="/risk" />
        <Route element={<Navigate replace to="/threats" />} path="/closest-approach" />
        <Route element={<Navigate replace to="/avoidance" />} path="/predictor" />
        <Route element={<Navigate replace to="/report" />} path="/reports" />
        <Route element={<Navigate replace to="/system" />} path="/architecture" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AppShell>
      <AnimatedRoutes />
    </AppShell>
  );
}
