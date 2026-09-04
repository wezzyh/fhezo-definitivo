import {
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import CartDrawer from "./components/cart/CartDrawer";

import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import AccountPage from "./pages/AccountPage";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />

      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/produto/:slug"
          element={<ProductPage />}
        />

        <Route
          path="/conta"
          element={<AccountPage />}
        />
      </Routes>

      <Footer />

      <CartDrawer />
    </>
  );
}