# CloudIT_final-project
## **HTW Campus Events Hub**
**Hosted link:** http://4.226.53.18

A Platform for Event-organisers from the University, where they can publish events and workshops for students to browse and register for them. 

Organisers create and manage events and see who has signed up. Students browse and filter events by department and category, register for them, add personal notes to their registrations and cancel if their plans change. A role switcher in the navigation bar lets you move between the Guest, Student and Organiser views without a login system.

I've also added a **Reset demo data** button, which clears everything and restores sample events and the guest role, so the website can be demoed from a clean state without redeploying.

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

### **Serverless Component**
The serverless component is an Azure Function on a Consumption plan. It generates a booking refrence when a student registers, and only runs when it is called.