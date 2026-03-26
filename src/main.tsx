import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import Template from "./layouts/Template";
import { ThemeProvider } from "./context/ThemeContext";
import { configServer } from "@/config/ConfigServer";
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from "@/libs/better-auth";
import { BackdoorAuthProvider } from "@/template/auth/context";
import { RoleProvider } from "@/context/role";
import { QueryProvider } from "@/libs/tanstack-query";
import { ToastProvider } from "@/libs/sonner";
import { LoginPage, RegisterPage, ForgotPasswordPage } from "@/template/auth";
import Users from "./features/users/pages/Users";
import Perfil from "./features/users/pages/Perfil";

const { useConfigApp, useAuthConfig } = configServer();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <RoleProvider>
          <BackdoorAuthProvider>
            <ThemeProvider>
              <ToastProvider />
              <Routes>
                <Route
                  path={useAuthConfig.AUTH_LOGIN_PATH}
                  element={
                    <PublicOnlyRoute redirectTo="/">
                      <LoginPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path={useAuthConfig.AUTH_REGISTER_PATH}
                  element={
                    <PublicOnlyRoute redirectTo="/">
                      <RegisterPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path={useAuthConfig.AUTH_FORGOT_PASSWORD_PATH}
                  element={
                    <PublicOnlyRoute redirectTo="/">
                      <ForgotPasswordPage />
                    </PublicOnlyRoute>
                  }
                />

                {/* Rutas protegidas */}
                <Route
                  element={
                    <ProtectedRoute redirectTo={useAuthConfig.AUTH_LOGIN_PATH}>
                      <Template />
                    </ProtectedRoute>
                  }
                >
                  {/* Rutas del sistema (Sidebar) */}
                  {useConfigApp.NAVIGATION_APP.map((item) => (
                    <Route
                      key={item.id}
                      path={item.link}
                      element={<item.component />}
                    />
                  ))}
                  <Route path="/usuarios" element={<Users />} />
                  <Route path="/perfil" element={<Perfil />} />

                  {/* Rutas del template (Header/UserMenu) */}
                  {useConfigApp.TEMPLATE_ROUTES?.map((item) => (
                    <Route
                      key={item.id}
                      path={item.link}
                      element={<item.component />}
                    />
                  ))}
                </Route>
              </Routes>
            </ThemeProvider>
          </BackdoorAuthProvider>
        </RoleProvider>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryProvider>
    </BrowserRouter>
  </StrictMode>,
);
