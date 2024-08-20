import React from 'react';
import { Container, Row, Col, Card, Button, ListGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom'; // Importa useNavigate
import './Dashboard.css'; // Asegúrate de que este archivo contiene estilos compatibles

function Dashboard() {
  const navigate = useNavigate(); // Define el hook para navegación

  const handleLogout = () => {
    // Elimina el token del localStorage o donde lo hayas guardado
    localStorage.removeItem('token');

    // Redirige al usuario a la página de login
    navigate('/login');
  };

  const handlePlay = () => {
    // Redirige al usuario a la pantalla del juego
    navigate('/game'); // Asegúrate de que '/game' sea la ruta correcta para tu juego
  };

  return (
    <Container className="my-5">
      <Row>
        <Col md={4}>
          <Card className="mb-4 profile-card">
            <Card.Header>Profile</Card.Header>
            <Card.Body>
              <Card.Title>Welcome, User!</Card.Title>
              <Card.Text>
                Here you can manage your account settings and view your activity.
              </Card.Text>
              <div className="profile-card-buttons">
                <Button variant="primary">View Profile</Button>
                <Button variant="danger" className="logout-button" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          <Row>
            <Col>
              <Card className="mb-4">
                <Card.Header>Recent Activity</Card.Header>
                <ListGroup variant="flush">
                  <ListGroup.Item>Activity 1</ListGroup.Item>
                  <ListGroup.Item>Activity 2</ListGroup.Item>
                  <ListGroup.Item>Activity 3</ListGroup.Item>
                </ListGroup>
              </Card>
            </Col>
          </Row>

          <Row className="d-flex">
            <Col md={6} className="d-flex">
              <Card className="flex-fill">
                <Card.Header>Statistics</Card.Header>
                <Card.Body>
                  <Card.Title>Site Statistics</Card.Title>
                  <Card.Text>
                    Here are some interesting statistics about your activity.
                  </Card.Text>
                  <Button variant="secondary">View Details</Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="d-flex">
              <Card className="flex-fill">
                <Card.Header>Notifications</Card.Header>
                <Card.Body>
                  <Card.Title>Recent Notifications</Card.Title>
                  <Card.Text>
                    Check your recent notifications and updates.
                  </Card.Text>
                  <Button variant="warning">View Notifications</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
      
      {/* Botón PLAY en la parte inferior centrado */}
      <Button className="play-button" onClick={handlePlay}>
        PLAY
      </Button>
    </Container>
  );
}

export default Dashboard;
