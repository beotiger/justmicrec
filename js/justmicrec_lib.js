var justMicRec = {
	config: {
		// path to server side script for uploading WAV/MP3 blobs
		hostPath: 'micrecajax.php',
		// path to recording worker relative to current HTML document
		workerPath: 'js/justmicrecworker.js',

		// callback functions
		'recordingError': function(e) { alert(e) },
		'recordingActivity': function(analyserNode, seconds) {},
		'recordingStopped': function() {},
		'uploadingProcess': function(current, total) {},
		'WAVsendingFinished': function() {},
		
		callback: function() {} // empty callback
	},
	
	player: new Audio(), // or: document.createElement('audio'),
	activeId: null,
	secs: 0,
	tensecs: 0,
	
	context: null,
	node: null,
	analyserNode: null,

	worker: null,
	blob: null,
  recording: false,	// flag which shows if recording is in progress
  callback: null,				// callback functions
	
  configure: function(options) {
		for (var prop in options)
				this.config[prop] = options[prop];
  },

	init: function(source) {

    var bufferLen = this.config.bufferLen || 4096;

    this.context = source.context;
    if(!this.context.createScriptProcessor)
       this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    else
       this.node = this.context.createScriptProcessor(bufferLen, 2, 2);

		// create analyser   
    this.analyserNode = this.context.createAnalyser();
    this.analyserNode.smoothingTimeConstant = 0.3;
    // this.analyserNode.fftSize = 1024;

		// create streaming sequence of analyser and recorder nodes
    source.connect(this.analyserNode);
    this.analyserNode.connect(this.node);
    this.node.connect(this.context.destination);

    this.node.onaudioprocess = function(e) {
      if(justMicRec.recording)
      	justMicRec.worker.postMessage({
	        command: 'record',
	        buffer: [
	          e.inputBuffer.getChannelData(0),
	          e.inputBuffer.getChannelData(1)
	        ]
      });
    }

    this.worker = new Worker(this.config.workerPath);

    // catcher for worker callback events
	  this.worker.onmessage = function(e) {
	    justMicRec.callback(e.data);
	  }
    
    this.worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate
      }
    });

    // start recording after first initialization
    this.start(this.secs);
	},

	// start new recoding
  start: function(secs) {
    this.secs = secs || 60;
    if(this.secs < 1)
    	this.secs = 60;
		this.tensecs = 0;

  	if(!this.context) {
  		this.initMic();
  		return;
		}

	  this.clear();
    this.recording = true;

    this.activeId = setInterval(this.recActivity, 100);
  },

  // resume recoding
  resume: function() {
  	if(!this.context || this.secs <= 0) {
  		this.config['recordingStopped']();
			return;
  	}

    this.recording = true;
    this.activeId = setInterval(this.recActivity, 100);
  },
	
	// stop/pause recording
  stop: function() {
  	clearInterval(this.activeId);
    this.recording = false;
    // after stopping/pausing
	  this.exportMonoWAV(this.doneWAVEncoding);
  },

	// clear recording buffers and current blob
  clear: function() {
    this.worker.postMessage({ command: 'clear' });
    this.blob = null;
  },

  // callback function being called during recording process
	recActivity: function() {
		// every 10th call - one second
		if((++justMicRec.tensecs % 10) == 0)
			--justMicRec.secs;
		// when timer is over stop recording
		if(justMicRec.secs <= 0)
			justMicRec.stop();

		justMicRec.config['recordingActivity'](justMicRec.analyserNode, justMicRec.secs);
	},

  exportWAV: function(cb) {
    this.callback = cb || this.config.callback;
    this.worker.postMessage({
      command: 'exportWAV',
      type: 'audio/wav'
    });
  },

  exportMonoWAV: function(cb) {
    this.callback = cb || this.config.callback;
    this.worker.postMessage({
      command: 'exportMonoWAV',
      type: 'audio/wav'
    });
  },

	// callback event triggered after to WAV encoding		
	doneWAVEncoding: function(blob) {
		justMicRec.blob = blob;
		// put WAV in player for previewing
		justMicRec.player.src = (window.URL || window.webkitURL).createObjectURL(blob);
		justMicRec.config['recordingStopped']();
	},

	getWAVsize: function() {
		if(this.blob && this.blob.size)
			return this.blob.size;
		return 0;
	},
	
	preview: function() {
		this.player.play();
	},

	stoppreview: function() {
		this.player.pause();
		this.player.currentTime = 0;
	},
	
	sendWAV: function() {
		if(this.blob)
			this.uploadRecording(this.blob);
		else
			this.config['recordingError']('The recording is not ready yet');
	},

	// send WAV file to server
	// NOTE: server should send `ok` string if uploading succeeded
	uploadRecording: function(blob)
	{
		var xhr = new XMLHttpRequest(),
				xupl = xhr.upload != null ? xhr.upload : xhr,
    		headerName,
    		headers = {
		      'Accept': 'text/plain',
		      'Cache-Control': 'no-cache',
		      'X-Requested-With': 'XMLHttpRequest'
		    };

	  xhr.open('POST', this.config.hostPath, true);
	
	  // uploding progress
	  xupl.onprogress = function(e) {
	  	justMicRec.config['uploadingProcess'](e.loaded, e.total);
	  }
	
	  // if status == 200 success then
	  xhr.onload = xhr.onerror = function() {
	    if (this.status == 200 && this.readyState == 4 && this.responseText == 'ok')
				justMicRec.config['WAVsendingFinished']();
			else
				justMicRec.config['recordingError'](this.responseText);
	  };

		// set some HTTP headers
    for (headerName in headers)
        xhr.setRequestHeader(headerName, headers[headerName]);
		
		// send wav data to server
	  xhr.send(blob);
	},

	gotStream: function(stream) {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;

		// first initialization
		justMicRec.init(new window.AudioContext().createMediaStreamSource(stream));
	},
	
	// первая инициализация микрофона, запрос доступа
	initMic: function() {
		var constraints = {
      'audio': {
	      'mandatory': {
	          'googEchoCancellation': 'false',
	          'googAutoGainControl': 'false',
	          'googNoiseSuppression': 'false',
	          'googHighpassFilter': 'false'
	      },
	      'optional': []
      },
      'video': false
	  };

		var legacyMedia = (navigator.getUserMedia || navigator.webKitGetUserMedia || navigator.moxGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
		
		if (navigator.mediaDevices.getUserMedia) {
	    navigator.mediaDevices.getUserMedia(constraints)
	    	.then(this.gotStream).catch(function (e) {
	     		justMicRec.config['recordingError'](e); 
	     });
		}
		else if(legacyMedia)
	    legacyMedia(constraints, this.gotStream, function(e) {
	            justMicRec.config['recordingError'](e);
      });
	  else
	  	this.config['recordingError']('This browser does not support getUserMedia');
	},

	// return true if current user agent (UA) supports getUserMedia interface
	UAhasUserMedia: function() {
		return !!((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
			(navigator.getUserMedia || navigator.webKitGetUserMedia || navigator.moxGetUserMedia ||
					navigator.mozGetUserMedia || navigator.msGetUserMedia));
	}


}
