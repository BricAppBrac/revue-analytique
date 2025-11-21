import { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * Lecture d'un onglet de balance :
 * Retourne une Map : compte → { compte, libelle, solde }
 */
function readBalanceSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return new Map();

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const map = new Map();

  rows.forEach((row) => {
    const compte = row["Compte"];
    const libelle = row["Libellé"];

    if (!compte) return;

    // 🔹 Cherche la colonne "Solde" même s'il y a des espaces autour
  const soldeKey = Object.keys(row).find(
    (key) => key && key.trim() === "Solde"
  );

  const rawSolde = soldeKey ? row[soldeKey] : 0;

  const s =
    typeof rawSolde === "number"
      ? rawSolde
      : Number(
          (rawSolde ?? "")
            .toString()
            .replace(/\s/g, "") // enlève les espaces
            .replace(",", ".")  // au cas où, pour les décimales
        );

    if (!map.has(compte)) {
      map.set(compte, {
        compte,
        libelle: libelle || "",
        solde: s || 0,
      });
    } else {
      const existing = map.get(compte);
      existing.solde += s || 0;
      if (!existing.libelle && libelle) {
        existing.libelle = libelle;
      }
    }
  });

  return map;
}

// Applique un format numérique à une colonne entière (sauf l'en-tête)
function applyNumberFormatToColumn(sheet, colLetter, formatString) {
  if (!sheet || !sheet["!ref"]) return;

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const colIndex = XLSX.utils.decode_col(colLetter);

  // On commence à la ligne 1 (index 0 = en-tête)
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const addr = XLSX.utils.encode_cell({ r: row, c: colIndex });
    const cell = sheet[addr];
    if (cell && typeof cell.v === "number") {
      cell.z = formatString;
    }
  }
}

export default function UploadRevueAnalytique() {
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedN, setSelectedN] = useState("");
  const [selectedN1, setSelectedN1] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Chargement du fichier Excel
   */
  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    setFile(f);
    setInfoMessage("");
    setErrorMessage("");
    setSheetNames([]);
    setSelectedN("");
    setSelectedN1("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      const wb = XLSX.read(data, { type: "array" });

      setWorkbook(wb);
      setSheetNames(wb.SheetNames || []);
    };

    reader.readAsArrayBuffer(f);
  };

  /**
   * Génération de la Revue Analytique dans un nouvel onglet
   */
  const handleGenerate = () => {
    setInfoMessage("");
    setErrorMessage("");

    if (!file || !workbook) {
      setErrorMessage("Merci de sélectionner un fichier Excel.");
      return;
    }
    if (!selectedN || !selectedN1) {
      setErrorMessage(
        "Merci de choisir les onglets pour les périodes N et N-1."
      );
      return;
    }

    try {
      const mapN = readBalanceSheet(workbook, selectedN);
      const mapN1 = readBalanceSheet(workbook, selectedN1);

      const allComptes = new Set([
        ...Array.from(mapN.keys()),
        ...Array.from(mapN1.keys()),
      ]);

      const rows = [];

      allComptes.forEach((compte) => {
        const recN = mapN.get(compte);
        const recN1 = mapN1.get(compte);

        const libelle = recN?.libelle || recN1?.libelle || "";
        const soldeN = recN?.solde ?? 0;
        const soldeN1 = recN1?.solde ?? 0;

        const variationEur = soldeN - soldeN1;
        const variationPct =
          soldeN1 !== 0 ? variationEur / soldeN1 : null;

        rows.push([
          compte,
          libelle,
          soldeN,
          soldeN1,
          variationEur,
          variationPct,
        ]);
      });

      rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));

      // En-têtes = noms d’onglets sélectionnés
      const header = [
        "Compte",
        "Libellé",
        selectedN.replace(/\s+/g, ""),   // titre colonne N
        selectedN1.replace(/\s+/g, ""),  // titre colonne N-1
        "Variation €",
        "Variation %",
      ];

      const dataForSheet = [header, ...rows];

      const wsRevue = XLSX.utils.aoa_to_sheet(dataForSheet);

      const newWb = {
        ...workbook,
        Sheets: { ...workbook.Sheets },
        SheetNames: [...workbook.SheetNames],
      };

      newWb.Sheets["Revue analytique"] = wsRevue;
      if (!newWb.SheetNames.includes("Revue analytique")) {
        newWb.SheetNames.push("Revue analytique");
      }

            const MONEY_FORMAT =
        "_-* #,##0.00_-;\\-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
      const PERCENT_FORMAT = "0.0%";

      // 📌 1) Mise en forme des onglets existants : colonne C en monétaire
      newWb.SheetNames.forEach((name) => {
        if (name === "Revue analytique") return; // on traite à part
        const sheet = newWb.Sheets[name];
        applyNumberFormatToColumn(sheet, "C", MONEY_FORMAT);
      });

      // 📌 2) Mise en forme de l'onglet "Revue analytique"
      const sheetRevue = newWb.Sheets["Revue analytique"];
      if (sheetRevue) {
        // Colonnes C, D, E en monétaire
        applyNumberFormatToColumn(sheetRevue, "C", MONEY_FORMAT);
        applyNumberFormatToColumn(sheetRevue, "D", MONEY_FORMAT);
        applyNumberFormatToColumn(sheetRevue, "E", MONEY_FORMAT);

        // Colonne F en pourcentage, 1 décimale
        applyNumberFormatToColumn(sheetRevue, "F", PERCENT_FORMAT);
      }



      const wbout = XLSX.write(newWb, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const baseName = file.name.replace(/(\.xlsm?|\.XLSM?)$/, "");
      const outName = `${baseName}_revue_analytique.xlsx`;

      saveAs(blob, outName);

      setInfoMessage('Feuille "Revue analytique" générée avec succès.');
    } catch (err) {
      console.error(err);
      setErrorMessage(
        "Une erreur est survenue. Vérifie les colonnes : Compte / Libellé / Solde."
      );
    }
  };

  return (
    <div className="upload-content">
      <div className="upload-head">
        <div className="upload-title">
          <h2>Fichier Source</h2>
          <p>Sélectionne un fichier Excel contenant les balances N et N-1.</p>

          <input type="file" accept=".xlsx,.xlsm" onChange={handleFile} />

          {file && <p className="file-name">{file.name}</p>}
        </div>
      </div>

      {sheetNames.length > 0 && (
        <>
          <div className="row-select">
            <div className="period-block">
              <h3>Période N (la plus récente)</h3>
              <label>Onglet :</label>
              <select value={selectedN} onChange={(e) => setSelectedN(e.target.value)}>
                <option value="">-- choisir un onglet --</option>
                {sheetNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="period-block">
              <h3>Période N-1</h3>
              <label>Onglet :</label>
              <select value={selectedN1} onChange={(e) => setSelectedN1(e.target.value)}>
                <option value="">-- choisir un onglet --</option>
                {sheetNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-submit">
            <button type="button" onClick={handleGenerate}>
              Générer la Revue Analytique
            </button>
          </div>
        </>
      )}

      {infoMessage && <p className="info-message">{infoMessage}</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
}

