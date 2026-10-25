# Sol Atlas

A one-page website about the Sun and the eight planets.

- Colours: Deep Space `#0B1026`, Electric Blue `#3B5BDB`, Neon Cyan `#00D9FF`, Ice White `#E8F7FF`
- The solar system is a 3D scene made with Three.js (`solar3d.js`). The planets orbit the Sun and spin on their own axes at their real axial tilt, so Venus and Uranus spin backwards. The scene has bloom, a slow camera drift, an asteroid belt and Saturn's rings. All the planet textures are generated in code, so there are no image files.
- On a computer, hover over a planet. On a phone, press and hold one. The orbits ease to a stop, the planet gets bigger, and its details appear below. Click or tap a planet to fly the camera to it, and drag to turn the view. The buttons under the scene do the same things.

It's plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser. Three.js loads from the jsDelivr CDN, so the 3D view needs an internet connection.
