// App.jsx
import UploadRevueAnalytique from "./components/UploadRevueAnalytique";

function App() {
  return (
    <div className="home">
      <div className="home-title">
        <h1>REVUE ANALYTIQUE</h1>
        
      {/* éventuellement un bouton "maison" plus tard */}
      </div>
<h2>******************************************</h2>
      <div className="home-content">
        <UploadRevueAnalytique />
      </div>
    </div>
  );
}

export default App;
