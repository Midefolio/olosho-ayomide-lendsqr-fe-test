import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.scss'
import { Provider } from 'react-redux'
import { store } from './states'
import { UserContextProvider } from './context/authContext'
import { Toaster } from 'sonner'
import { UsersPageProvider } from './context/usersPageContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <UserContextProvider>
        <UsersPageProvider>
          <App />
          <Toaster richColors position="top-right" />
        </UsersPageProvider>
      </UserContextProvider>
    </Provider>
  </StrictMode>
)