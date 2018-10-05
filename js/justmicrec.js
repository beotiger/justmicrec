// render test justMicRec instance

$(document).ready(function(){
	// INITIALIZATION
	$('#recn').val(new Date().getTime()); // unique id

	justMicRec.configure({
		hostPath : 'micrecajax.php?f=' + $('#recn').val(),
		workerPath: 'js/justmicrecworker.js',

		// callback functions
		recordingActivity: function(analyserNode, seconds) { activity(analyserNode, seconds); },
		recordingError: function(e) { __log('[ERR] ' + e) },
		recordingStopped: recordingStopped,
		WAVsendingFinished: sendingFinished,
		uploadingProcess: function(current, total){
						uploading(Math.round(current / total * 100)); }
	 });

	// COMMANDS
	var maxTime; // store maximum time for recording globally
	
	// Start recording process
	$('#start').click(function() {
		// turn on STOP and PAUSE buttons
		$('#stop').prop('disabled', false);

		// turn off START/RESUME button
		$('#start').prop('disabled', true);
		$('#resume').prop('disabled', true);

		// define maxTime from select field
		maxTime = parseInt($('#maxtime').val());
		__log('** justMicRec.start(' + maxTime + ')');
		justMicRec.start(maxTime);
	});

	$('#stop').click(function() {
		__log('** justMicRec.stop()')
	 	justMicRec.stop();
	});

	$('#resume').click(function() {
		__log('** justMicRec.resume()')
		// turn on STOP/PAUSE buttons
		$('#stop').prop('disabled', false);

		// turn off START/RESUME buttons
		$('#start').prop('disabled', true);
		$('#resume').prop('disabled', true);

	 justMicRec.resume();
	});
	
	// disable PREVIEW button and enable STOP PREVIEW button
	$('#preview').click(function() {
	 __log('** justMicRec.preview()');
	 justMicRec.preview();
	});

	// disable STOP PREVIEW button and enable PREVIEW button
	$('#stoppreview').click(function() {
	 __log('** justMicRec.stoppreview()');
	 justMicRec.stoppreview();
	});

	$('#sendwav').click(function() {
		__log('** justMicRec.sendWAV()');
		
		$('#level').text('');
		justMicRec.sendWAV();
	});

	// EVENTS
	function recordingStopped()
	{
		__log('!! Recording is ready!');

	 	$('#wavsize').text(justMicRec.getWAVsize().toLocaleString());
	 	// $('#wavlength').text(justMicRec.getWAVlength().toLocaleString());

		// turn on START/RESUME and PREVIEW buttons and turn off STOP/PAUSE button
		$('#start').prop('disabled', false);
		$('#resume').prop('disabled', false);
		$('#preview').prop('disabled', false);
		$('#stoppreview').prop('disabled', false);
		$('#stop').prop('disabled', true);
	}

	function sendingFinished()
	{
		__log('!! Recording has been sent to server successfully!');
		
		// create audio element and a link for new recording
		d = new Date().getTime();	// disable caching it
		$('#wavaudi').html('<audio controls src="micrecs/' + $('#recn').val() + '.wav?' + d + '"></audio>');
		$('#wavaudid').html('<a download="' + $('#recn').val() + '.wav" href="micrecs/' + $('#recn').val() + '.wav?' + d + '">Download this recording</a>');
		
		// change unique id and reconfigure path to new wav file
		$('#recn').val(new Date().getTime());
		justMicRec.configure({
			hostPath : 'micrecajax.php?f=' + $('#recn').val()
		});
	}

	// analyserNode - node to recording data, time - seconds
	function activity(analyserNode, time)
	{
		// maxTime - global var
		// var time = maxTime - time;
		if (time < 0) time = 0;
		var min = Math.floor(time / 60),
				sec = Math.floor(time % 60);

		$('#time').text((min < 10 ? "0" : "") + min + ":" + (sec < 10 ? "0" : "") + sec);
		
		// $('#level').text(level);

		updateAnalysers(analyserNode);
		updateAnalysers2(analyserNode); // second variant
	}

	// процесс закачки
	function uploading(percent)
	{
		$('#levelbar2').width(percent + '%');
	}

	// let's log...
	function __log(s)
	{
		$('#log').val($('#log').val() + s + '\n')
		.scrollTop($('#log')[0].scrollHeight);
	}
	
  var canvas = document.getElementById('levelbar'),
  		canvasWidth = canvas.width,
  		canvasHeight = canvas.height,
  		analyserContext = canvas.getContext('2d');

	function updateAnalysers(analyserNode) {
    var SPACING = 3,
	    	BAR_WIDTH = 1,
  	  	numBars = Math.round(canvasWidth / SPACING),
    		freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

    analyserNode.getByteFrequencyData(freqByteData); 

    analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
    analyserContext.fillStyle = '#F6D565';
    analyserContext.lineCap = 'round';
    var multiplier = analyserNode.frequencyBinCount / numBars;

    // Draw rectangle for each frequency bin.
    for (var i = 0; i < numBars; ++i) {
        var magnitude = 0;
        var offset = Math.floor( i * multiplier );
        // gotta sum/average the block, or we miss narrow-bandwidth spikes
        for (var j = 0; j < multiplier; j++)
            magnitude += freqByteData[offset + j];
        magnitude = magnitude / multiplier;
        var magnitude2 = freqByteData[i * multiplier];
        analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
        analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude);
    }
	}

	function updateAnalysers2(analyserNode) {
		// OLED 
    var array = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(array);
    var values = 0;

    var length = array.length;
    for (var i = 0; i < length; i++) {
      values += array[i];
    }

    var average = values / length;
    $('#levelbar2').width(Math.min(parseInt(average * 2), 100) + '%');
	}	
});
