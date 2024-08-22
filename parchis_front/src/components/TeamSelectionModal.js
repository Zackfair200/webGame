import React, { useState } from "react";
import "./TeamSelectionModal.css";

const TeamSelectionModal = ({ isOpen, onClose, onSelectTeam }) => {
  const [selectedTeam, setSelectedTeam] = useState(null);

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
  };

  const handleReady = () => {
    if (selectedTeam) {
      onSelectTeam(selectedTeam);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Nuevo contenedor blanco que engloba los equipos y los botones */}
        <div className="modal-inner-container">
          <h2>Select Your Team</h2>
          <div className="team-options">
            {["Red", "Green", "Yellow", "Blue"].map((team) => (
              <button
                key={team}
                className={`team-button ${team.toLowerCase()} ${
                  selectedTeam === team ? "selected" : ""
                }`}
                onClick={() => handleTeamSelect(team)}
              >
                {team}
              </button>
            ))}
          </div>
          <div className="modal-button-container">
            <button onClick={handleReady} className="ready-button">
              Ready
            </button>
            <button onClick={onClose} className="close-button">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSelectionModal;
