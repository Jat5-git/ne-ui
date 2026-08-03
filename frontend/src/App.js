import React from "react";
import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StoreProvider } from "@/store/StoreContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import Orders from "@/pages/Orders";
import MasterProducts from "@/pages/MasterProducts";
import ProductDetail from "@/pages/ProductDetail";
import ListingsAndChannels from "@/pages/ListingsAndChannels";
import ListingDetail from "@/pages/ListingDetail";
import Returns from "@/pages/Returns";
import Channels from "@/pages/Channels";
import Catalogue from "@/pages/Catalogue";

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/products" element={<MasterProducts />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/listings" element={<ListingsAndChannels />} />
            <Route path="/listings/:id" element={<ListingDetail />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/catalogue" element={<Catalogue />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
