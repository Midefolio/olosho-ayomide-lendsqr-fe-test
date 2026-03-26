import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
  Navigate,
} from "react-router-dom"
import NotFound from "./notfound"
import UsersPage from "./pages/dashboardPages/customerPages/users/usersPage"
import UserDetailsPage from "./pages/dashboardPages/customerPages/users/userDetailsPage"
import LoginPage from "./pages/authPages/loginPage"


const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("auth_token")
  return token ? <>{children}</> : <Navigate to="/" replace />
}

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("auth_token")
  return !token ? <>{children}</> : <Navigate to="/admin/customers/users" replace />
}

// ── Router ─────────────────────────────────────────────────────────────────────
// Defined OUTSIDE the component so it's not recreated on every render.

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/">
      <Route
        path="/"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/admin/customers/users"
        element={
          <PrivateRoute>
            <UsersPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/customers/user/:userId"
        element={
          <PrivateRoute>
            <UserDetailsPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Route>
  )
)

const App = () => {
  return <RouterProvider router={router} />
}

export default App