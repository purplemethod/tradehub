import UserProvider from "./pages/context/UserProvider";
import { Route, Routes } from "react-router";
import LoginPage from "./pages/LoginPage";
import NavBar from "./pages/NavBar";
import AllProducts from "./pages/AllProducts";

function App() {
  return (
    <>
      <UserProvider>
        <NavBar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AllProducts />} />
        </Routes>
      </UserProvider>
    </>
  );
}

export default App;
