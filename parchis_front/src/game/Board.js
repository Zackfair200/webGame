import "./Board.css";
import Dice from "react-dice-complete";
import React, { useState } from "react";
import TeamSelectionModal from "./TeamSelectionModal"; // Importa el modal
import { Players } from "./assets/players";
import {HomeBox} from './HomeBox'
import {BoardBox} from './BoardBox'

const Board = () => {
  const [diceValue, setDiceValue] = useState(1);
  const [isModalOpen, setModalOpen] = useState(false); // Estado para el modal
  const [team, setTeam] = useState(null); // Estado para el equipo seleccionado
  const [selectedTeamColor, setSelectedTeamColor] = useState("#B0B0B0"); // Color neutro inicial (gris claro)

  const handleRoll = (value) => {
    setDiceValue(value);
    console.log(`Dado lanzado: ${value}`);
    // Aquí puedes agregar la lógica para mover las fichas según el valor del dado
  };

  const handleStartClick = () => {
    setModalOpen(true); // Abre el modal al hacer clic en "Start"
  };

  const handleCloseModal = () => {
    setModalOpen(false); // Cierra el modal
  };

  const handleTeamSelect = (selectedTeam) => {
    setTeam(selectedTeam);
    console.log(`Equipo seleccionado: ${selectedTeam}`);

    // Actualiza el color del dado basado en el equipo seleccionado
    let color;
    switch (selectedTeam) {
      case "Red":
        color = "#e74c3c";
        break;
      case "Green":
        color = "#27ae60";
        break;
      case "Yellow":
        color = "#f1c40f";
        break;
      case "Blue":
        color = "#3498db";
        break;
      default:
        color = "#B0B0B0"; // Color neutro en caso de no seleccionar
    }
    setSelectedTeamColor(color);
  };

  return (
    <div className="board-container">
      {/* Botón para iniciar el juego */}
      <button onClick={handleStartClick} className="start-button">
        Start
      </button>

      {/* Mostrar equipo seleccionado si hay uno */}
      {team && <p>Estás jugando como: {team}</p>}
      <table>
        <tbody>
          <tr>
            <HomeBox player={Players.Yellow} />
            <td colSpan="2">1</td>
            <td colSpan="2">68</td>
            <td colSpan="2">67</td>
            <HomeBox player={Players.Green} />
          </tr>
          <tr>
            <td colSpan="2">2</td>
            <td className="amarillo" colSpan="2">
              -
            </td>
            <td colSpan="2">66</td>
          </tr>
          <tr>
            <td colSpan="2">3</td>
            <td className="amarillo" colSpan="2">
              -
            </td>
            <td colSpan="2">65</td>
          </tr>
          <tr>
            <td colSpan="2">4</td>
            <td className="amarillo" colSpan="2">
              -
            </td>
            <td colSpan="2">64</td>
          </tr>
          <tr>
            <td className="amarillo" colSpan="2">
              5
            </td>
            <td className="amarillo" colSpan="2">
              -
            </td>
            <td colSpan="2">63</td>
          </tr>
          <tr>
            <td colSpan="2">6</td>
            <td className="amarillo" colSpan="2">
              -
            </td>
            <td colSpan="2">62</td>
          </tr>
          <tr>
            <td colSpan="2">7</td>
            <td className="amarillo" colSpan="2">
              -
            </td>
            <td colSpan="2">61</td>
          </tr>
          <tr>
            <BoardBox position={16} />
            <BoardBox position={15} />
            <BoardBox position={14} />
            <BoardBox position={13} />
            <BoardBox position={12} />
            <BoardBox position={11} />
            <BoardBox position={10} />
            <td id="vacio"></td>
            <td>8</td>
            <td>-</td>
            <td>-</td>
            <td>60</td>
            <td id="vacio"></td>
            <td rowSpan="2">58</td>
            <td rowSpan="2">57</td>
            <td className="verde" rowSpan="2">
              56
            </td>
            <td rowSpan="2">55</td>
            <td rowSpan="2">54</td>
            <td rowSpan="2">53</td>
            <td rowSpan="2">52</td>
          </tr>
          <tr>
            <td>9</td>
            <td colSpan="4" rowSpan="4">
              <img
                src="https://img.freepik.com/vector-gratis/castillo-cuento-hadas-diseno-dibujado-mano_23-2148468272.jpg?size=626&ext=jpg&uid=R159637564&ga=GA1.1.1603060310.1724089466&semt=ais_hybrid"
                alt="Imagen central"
              />
            </td>
            <td>59</td>
          </tr>
          <tr>
            <td rowSpan="2">17</td>
            <td className="azul" rowSpan="2">
              |
            </td>
            <td className="azul" rowSpan="2">
              |
            </td>
            <td className="azul" rowSpan="2">
              |
            </td>
            <td className="azul" rowSpan="2">
              |
            </td>
            <td className="azul" rowSpan="2">
              |
            </td>
            <td className="azul" rowSpan="2">
              |
            </td>
            <td>|</td>
            <td>|</td>
            <td className="verde" rowSpan="2">
              |
            </td>
            <td className="verde" rowSpan="2">
              |
            </td>
            <td className="verde" rowSpan="2">
              |
            </td>
            <td className="verde" rowSpan="2">
              |
            </td>
            <td className="verde" rowSpan="2">
              |
            </td>
            <td className="verde" rowSpan="2">
              |
            </td>
            <td rowSpan="2">51</td>
          </tr>
          <tr>
            <td>|</td>
            <td>|</td>
          </tr>
          <tr>
            <td rowSpan="2">18</td>
            <td rowSpan="2">19</td>
            <td rowSpan="2">20</td>
            <td rowSpan="2">21</td>
            <td className="azul" rowSpan="2">
              22
            </td>
            <td rowSpan="2">23</td>
            <td rowSpan="2">24</td>
            <td>25</td>
            <td>43</td>
            <td rowSpan="2">44</td>
            <td rowSpan="2">45</td>
            <td rowSpan="2">46</td>
            <td rowSpan="2">47</td>
            <td rowSpan="2">48</td>
            <td rowSpan="2">49</td>
            <td rowSpan="2">50</td>
          </tr>
          <tr>
            <td id="vacio"></td>
            <td>26</td>
            <td>-</td>
            <td>-</td>
            <td>42</td>
            <td id="vacio"></td>
          </tr>
          <tr>
            <HomeBox player={Players.Blue} />
            <td colSpan="2">27</td>
            <td className="rojo" colSpan="2">
              -
            </td>
            <td colSpan="2">41</td>
            <HomeBox player={Players.Red} />
          </tr>
          <tr>
            <td colSpan="2">28</td>
            <td className="rojo" colSpan="2">
              -
            </td>
            <td colSpan="2">40</td>
          </tr>
          <tr>
            <td colSpan="2">29</td>
            <td className="rojo" colSpan="2">
              -
            </td>
            <td className="rojo" colSpan="2">
              39
            </td>
          </tr>
          <tr>
            <td colSpan="2">30</td>
            <td className="rojo" colSpan="2">
              -
            </td>
            <td colSpan="2">38</td>
          </tr>
          <tr>
            <td colSpan="2">31</td>
            <td className="rojo" colSpan="2">
              -
            </td>
            <td colSpan="2">37</td>
          </tr>
          <tr>
            <td colSpan="2">32</td>
            <td className="rojo" colSpan="2">
              -
            </td>
            <td colSpan="2">36</td>
          </tr>
          <tr>
            <td colSpan="2">33</td>
            <td colSpan="2">34</td>
            <td colSpan="2">35</td>
          </tr>
        </tbody>
      </table>
      <div className="dice-container">
        <Dice
          numDice={1}
          rollDone={handleRoll}
          faceColor={selectedTeamColor} // Usar el color del equipo seleccionado
          dotColor="white"
          outline={true}
        />
      </div>
      {/* Modal de selección de equipo */}
      <TeamSelectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSelectTeam={handleTeamSelect}
      />
    </div>
  );
};

export default Board;