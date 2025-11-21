// App.jsx
import { useState } from "react";
import UploadRevueAnalytique from "./components/UploadRevueAnalytique";

function App() {
  // Clé pour forcer la réinitialisation du composant enfant
  const [resetKey, setResetKey] = useState(0);

  // Bouton Home : réinitialise l'appli
  const handleHome = () => {
    setResetKey((prev) => prev + 1);  // change la key -> remount
    window.scrollTo({ top: 0, behavior: "smooth" }); // optionnel
  };

  return (
    <div className="home">
      <div className="home-title">
        <h1>REVUE ANALYTIQUE</h1>
         <button onClick={handleHome}>
          <i className="fa-solid fa-house"></i>
        </button>
      
      </div>
<h2>******************************************</h2>
      <div className="home-content">
        {/* key = resetKey permet de repartir à zéro quand on clique sur la maison */}
        <UploadRevueAnalytique key={resetKey} />
      </div>
    </div>
  );
}

export default App;
