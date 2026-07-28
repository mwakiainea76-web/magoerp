/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { Route } from "react-router";

const SecurityDashboardPage = lazy(() => import("@/pages/security/SecurityDashboardPage").then((module) => ({ default: module.SecurityDashboardPage })));
const SecurityEventsPage = lazy(() => import("@/pages/security/SecurityEventsPage").then((module) => ({ default: module.SecurityEventsPage })));
const SecurityDevicesPage = lazy(() => import("@/pages/security/SecurityDevicesPage").then((module) => ({ default: module.SecurityDevicesPage })));
const SecuritySessionsPage = lazy(() => import("@/pages/security/SecuritySessionsPage").then((module) => ({ default: module.SecuritySessionsPage })));
const SecurityBlockedIpsPage = lazy(() => import("@/pages/security/SecurityBlockedIpsPage").then((module) => ({ default: module.SecurityBlockedIpsPage })));
const SecurityBlockedDevicesPage = lazy(() => import("@/pages/security/SecurityBlockedDevicesPage").then((module) => ({ default: module.SecurityBlockedDevicesPage })));
const SecurityBlockedUsersPage = lazy(() => import("@/pages/security/SecurityBlockedUsersPage").then((module) => ({ default: module.SecurityBlockedUsersPage })));
const UserSecurityProfilePage = lazy(() => import("@/pages/security/UserSecurityProfilePage").then((module) => ({ default: module.UserSecurityProfilePage })));
const ApiMonitoringPage = lazy(() => import("@/pages/security/ApiMonitoringPage").then((module) => ({ default: module.ApiMonitoringPage })));

export const SecurityRoutes = (
  <>
    <Route path="/security" element={<SecurityDashboardPage />} />
    <Route path="/security/events" element={<SecurityEventsPage />} />
    <Route path="/security/devices" element={<SecurityDevicesPage />} />
    <Route path="/security/sessions" element={<SecuritySessionsPage />} />
    <Route path="/security/blocked/ips" element={<SecurityBlockedIpsPage />} />
    <Route path="/security/blocked/devices" element={<SecurityBlockedDevicesPage />} />
    <Route path="/security/blocked/users" element={<SecurityBlockedUsersPage />} />
    <Route path="/security/users/:userId" element={<UserSecurityProfilePage />} />
    <Route path="/security/monitoring" element={<ApiMonitoringPage />} />
  </>
);
