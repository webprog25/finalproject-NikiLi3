
## Final Project

**Project Title:** Cubing-Timer

**Your Name:** Nikolaus Lindinger

### Overview
--------
The app allows Speedcubers to time their solves and store them in a database. It also shows simple statistics and allows for authentication to see the same solves on multiple devices. The app provides new random competition legal scrambles for each event type.

### Running
-------
#### Local testing

```
npm install
npm start
```

#### Deploy to Firebase
```
firebase login
firebase deploy
```

#### Deploy just the frontend
```
firebase deploy --only hosting
```

#### Deploy just the firebase rules
```
firebase deploy --only firestore
```

#### Deploy just the firestore indexes
```
firebase deploy --only firestore:indexes
```



No need to init a database

### Features
--------
- Scramble generation:
    * Fetches a new random scramble for different cube types
    * Shows an image of the correctly scrambled cube
    * Uses the official (World Cube Association) scramble generation tool written in Java (called TNoodle) which is hosted as a Lambda function in the AWS Cloud and can be used to fetch a new scramble over a REST API. NOTE: This REST API already exists and was created by me for an iOS Cubing Timer app.
    * Supports 13 different event types

- Timing the solve:
    * The user can hold down the space bar for 0.5 seconds then release it to start the timer
    * The user can tap the spae bar again to stop the timer and save the solve
    * While solving the cube a timer is running on the screen
    * After stopping the timer the time is visible on the screen

- Storing the solves:
    * The app saves to a Firestore database
    * The time of the solve and the corresponding scramble will be saved
    * The user sees the solve counts for each event in the dropdown
    * The user can delete the last solve by pressing 'o'

- Simple Statistics:
    * After each solve the averages are updated and shown on the screen
    * The averages are only shown if there are enough solves to calculate them

- Hosting:
    * The app is hosted on Firebase and can be accessed at https://cubing-timer-e5755.web.app 

- Local Storage:
    * The user id and last selected event is stored in local storage to persist the user across page reloads

- Authentication:
    * The user can create a new user or import an existing user
    * The user can enter the id of an existing account on another device to see the same solves (So you can be "logged in on multiple devices")

- Responsive design:
    * The app is fully responsive and looks good on all screen sizes (including phones and tablets)

- Touch support (mobile devices):
    * The timer can be started and stopped by holding the timer display on touch devices

- Live Event Updates:
    * The app uses websockets to update the UI in real-time when a solve is added or deleted from another device


### Collaboration and libraries

I consulted with ChatGPT for general guidance on how to implement certain features.

