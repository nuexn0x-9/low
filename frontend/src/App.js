import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import ProjectDashboard from "@/components/dashboard/ProjectDashboard";
import EditorShell from "@/components/editor/EditorShell";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProjectDashboard />} />
          <Route path="/editor/:id" element={<EditorShell />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-center" />
    </div>
  );
}

export default App;
