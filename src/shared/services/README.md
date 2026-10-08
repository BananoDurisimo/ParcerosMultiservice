# Conexión del frontend con la API

`api.js` es el único cliente HTTP de React. La URL se define en `.env` mediante
`VITE_API_URL`; para desarrollo local es `http://localhost:3000/api`.

El siguiente paso de integración sustituye las operaciones de memoria de
`DataContext` por llamadas a este cliente, módulo por módulo. El token de sesión
se guarda solamente en el navegador y se adjunta como `Authorization: Bearer`.
