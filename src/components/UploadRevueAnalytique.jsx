import { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function UploadRevueAnalytique() {
  const [file, setFile] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedN, setSelectedN] = useState("");
  const [selectedN1, setSelectedN1] = useState("");

  const handleFile = (e) => {
    const f = e.target.files[0];
    setFile(f);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });

      setSheetNames(workbook.SheetNames);
    };
    reader.readAsBinaryString(f);
  };

  return (
    <div class="upload-content">
      <div className="upload-head">
        <div className="upload-title">
      <h2>Fichier Source</h2>
      <input type="file" accept=".xlsx,.xlsm" onChange={handleFile} />
      {file && (
  <p className="file-name">
    {file.name}
  </p>
)}
 </div>
      </div>
      {sheetNames.length > 0 && (
        <>
          <h3>Choisir les onglets à comparer</h3>

          <label>Période N :</label>
          <select
            value={selectedN}
            onChange={(e) => setSelectedN(e.target.value)}
          >
            <option value="">-- choisir --</option>
            {sheetNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <br />
          <br />

          <label>Période N-1 :</label>
          <select
            value={selectedN1}
            onChange={(e) => setSelectedN1(e.target.value)}
          >
            <option value="">-- choisir --</option>
            {sheetNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </>
      )}
      
    </div>
  );
}
