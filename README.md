# justMicRec: Welcome!
## HTML5 JavaScript Microphone [-MP3] Recording

### First notes
* You can pause, preview and resume recording before sending it to server.
* Users should allow microphone access when browser asks them permission to do it.
* Actual recording process will start when user first allows it.
* Recording is being processed in stereo WAV blob, and is converted to mono WAV file when recording stopped for minimizing requiring disk and memory space usage.

### Using server-side script

Recordings are sent to server as raw POST data. You can grab and save it anywhere by server-side script of your choice.
In this project we use **micrecajax.php** script for that purpose.

### Home page and demo
For home page and working example see [this page](https://beotiger.com/justmicrec).

### An old JustRec
Please do not mess this project with an older *JustRec* project which uses ActionScript (Flash) as a recording backend.

**JustMicRec** uses only native browser support for media recording.
