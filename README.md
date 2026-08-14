# CloudIT_final-project
## **HTW Campus Events Hub**
**Hosted link:** http://4.226.53.18

A Platform for Event-organisers from the University, where they can publish events and workshops for students to browse and register them. 

Organisers create and manage events and see who has signed up. Students browse and filter events by department and category, register for them, add personal notes to their registrations and cancel if their plans change. A role switcher in the navigation bar lets you move between the Guest, Student and Organiser views without a login system.

### **Repository structure:**
```
frontend/ - 5 pages, nginx config, Dockerfile
backend/ - Express REST API, Example events, Dockerfile
serverless/ - Azure Function
kubernetes/ - frontend.yaml, backend.yaml (mongo + API)
docker-compose.yml
README.md
```

### **Running locally:**
Requires Docker Desktop

```bash
docker compose up --build
```
Then open http://localhost:8080. To stop: ctrl + C, then: `docker compose down`.