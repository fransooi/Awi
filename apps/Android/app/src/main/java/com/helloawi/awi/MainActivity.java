package com.helloawi.awi;

import static android.os.SystemClock.elapsedRealtime;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.os.Bundle;
import android.speech.tts.UtteranceProgressListener;
import android.widget.TextView;
import android.util.Log;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import android.Manifest;
import android.widget.Toast;
import android.speech.tts.TextToSpeech;
import java.io.*;
import java.util.Map;
import java.util.Stack;

import com.neovisionaries.ws.client.*;

import org.json.JSONException;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity
{
    public String animations = "..--++**ooOO00";
    public char[] animationChars;
    public int oldEyes;
    public int currentEyes;
    public static final int EYES_DOTS = 0;
    public static final int EYES_MINUS = 2;
    public static final int EYES_PLUS = 4;
    public static final int EYES_STARS = 6;
    public static final int EYES_oo = 8;
    public static final int EYES_OO = 10;
    public static final int EYES_00 = 12;
    public static final int HEARING_DURATION = 5 * 1000;
    public static final int LISTENING_DURATION = 1000 * 1000;
    public static final int WAITING_DURATION = 1000 * 1000;

    public float accX = 0;
    public float accY = 0;
    public float accZ = 0;
    public float rotX = 0;
    public float rotY = 0;
    public float rotZ = 0;

    // create variables of the two class
    public Accelerometer accelerometer;
    public Gyroscope gyroscope;
    public TextView eyes;
    public TextView leftBracket;
    public TextView rightBracket;
    public MainLoop mainLoopThread;
    public String mode = "";
    public String nextMode = "";
    public SpeechRecognizer speechRecognizer;
    public Intent speechRecognizerIntent;
    public String userInput = "";
    public final int MY_PERMISSIONS_RECORD_AUDIO = 1;
    public long startTime;
    public boolean oldRecognizeOn = false;
    public boolean recognizeOn = false;
    public TextToSpeech textToSpeech;
    public String toSay = "";
    public String saying = "";
    public String response = "";
    public int speechCount = 0;

    public boolean connect = false;
    public boolean connected = false;
    public int connecting = 0;
    public String connectionHandle;
    public static final String URL = "ws://194.110.192.59:1033";
    public static final int WSTIMEOUT = 5000;
    public WebSocket ws = null;
    public String toAsk = "";

    @Override
    protected void onCreate( Bundle savedInstanceState )
    {
        super.onCreate( savedInstanceState );
        setContentView( R.layout.activity_main );

        // Interface
        this.mode = "sleeping";
        this.animationChars = this.animations.toCharArray();
        this.eyes = findViewById( R.id.eyes );
        this.leftBracket = findViewById( R.id.left_bracket );
        this.rightBracket = findViewById( R.id.right_bracket );
        this.currentEyes = EYES_DOTS;
        this.oldEyes = -1;
        this.userInput = "";

        // instantiate them with this as context
        this.accelerometer = new Accelerometer(this);
        this.gyroscope = new Gyroscope(this);

        // create a listener for accelerometer
        MainActivity self = this;
        //on translation method of accelerometer
        this.accelerometer.setListener( (tx, ty, tz) -> {
            self.accX = tx;
            self.accY = ty;
            self.accZ = tz;
            //Log.d( "ACC", "X: " + tx + ", Y: " + ty + ", S: " + ts );
        } );

        // create a listener for gyroscope
        // on rotation method of gyroscope
        this.gyroscope.setListener( (rx, ry, rz) ->
        {
            self.rotX = rx;
            self.rotY = ry;
            self.rotZ = rz;
            //Log.d( "ROT", "RX: " + rx + ", RY: " + ry + ", RZ: " + rz );
        } );

        // Voice recognizer
        requestAudioPermissions();
        this.speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this );
        this.speechRecognizerIntent = new Intent( RecognizerIntent.ACTION_RECOGNIZE_SPEECH );
        this.speechRecognizerIntent.putExtra( RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM );
        this.speechRecognizerIntent.putExtra( RecognizerIntent.EXTRA_LANGUAGE, "fr-FR" );

        this.speechRecognizer.setRecognitionListener( new RecognitionListener()
        {
            @Override
            public void onReadyForSpeech( Bundle bundle )
            {

            }

            @Override
            public void onBeginningOfSpeech()
            {
            }

            @Override
            public void onRmsChanged( float v )
            {
            }

            @Override
            public void onBufferReceived( byte[] bytes )
            {

            }

            @Override
            public void onEndOfSpeech()
            {
                Log.d( "SPEECH", "End of speech" );
            }

            @Override
            public void onError( int i )
            {
                Log.d( "SPEECH", "On error " + i );
                if ( i == 7 )
                {
                    self.mode = "sleeping";
                    self.recognizeOn = false;
                }
            }

            @Override
            public void onResults( Bundle bundle )
            {
                ArrayList<String> data = bundle.getStringArrayList( SpeechRecognizer.RESULTS_RECOGNITION );
                self.userInput = data.get( 0 );
            }

            @Override
            public void onPartialResults( Bundle bundle )
            {

            }

            @Override
            public void onEvent( int i, Bundle bundle )
            {
                Log.d( "SPEECH", "On event " + i );
            }
        } );

        // create an object textToSpeech and adding features into it
        UtteranceProgressListener progressListener = new UtteranceProgressListener()
        {
            @Override
            public void onStart( String id )
            {
                self.saying = id;
            }

            @Override
            public void onDone( String id )
            {
                if ( id.equals( self.saying ) )
                {
                    self.saying = "";
                    self.mode = self.nextMode;
                }
            }

            @Override
            public void onError(String utteranceId)
            {

            }
        };

        this.textToSpeech = new TextToSpeech( getApplicationContext(), i ->
        {
            if ( i != TextToSpeech.ERROR )
            {
                self.textToSpeech.setOnUtteranceProgressListener( progressListener );
                self.textToSpeech.setLanguage( Locale.UK );
                self.textToSpeech.setPitch( 2 );
                self.textToSpeech.setSpeechRate( 1.33F );
            }
        });

        // Create the main loop
        this.mainLoopThread = new MainLoop( this );
        this.mainLoopThread.setRunning( true );
    }

    private void requestAudioPermissions()
    {
        if ( ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO ) != PackageManager.PERMISSION_GRANTED )
        {
            if ( ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.RECORD_AUDIO ) )
            {
                Toast.makeText(this, "Please grant permissions to record audio", Toast.LENGTH_LONG ).show();
                ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.RECORD_AUDIO }, MY_PERMISSIONS_RECORD_AUDIO );
            }
            else
            {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO }, MY_PERMISSIONS_RECORD_AUDIO );
            }
        }
    }

    //Handling callback
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults )
    {
        super.onRequestPermissionsResult( requestCode, permissions, grantResults );
        if ( requestCode == MY_PERMISSIONS_RECORD_AUDIO )
        {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d( "YEAH", "Permission granted" );
            }
            else
            {
                Toast.makeText(this, "Permissions Denied to record audio", Toast.LENGTH_LONG ).show();
            }
        }
    }

    @Override
    protected void onResume()
    {
        super.onResume();
        accelerometer.register();
        gyroscope.register();
    }

    @Override
    protected void onPause()
    {
        super.onPause();
        accelerometer.unregister();
        gyroscope.unregister();
    }

    // Called by the MainLoop in the mainloop thread...
    public int update()
    {
        switch ( this.mode )
        {
            case "sleeping":
                this.currentEyes = EYES_DOTS;
                if ( /*this.accX < 0 && */ this.accY > 8 /*&& this.accZ > 0*/ )
                {
                    if ( !this.connected )
                    {
                        this.recognizeOn = true;
                        this.mode = "hearing";
                        this.startTime = elapsedRealtime();
                    }
                    else
                    {
                        this.mode = "listening";
                    }
                }
                break;

            case "hearing":
                this.currentEyes = EYES_MINUS;
                if ( !this.userInput.equals( "" ) )
                {
                    this.recognizeOn = false;
                    if ( this.userInput.toLowerCase().contains( "oui" ) )
                    {
                        this.mode = "waking";
                    }
                    else
                    {
                        this.mode = "sleeping";
                    }
                }
                else
                {
                    long currentTime = elapsedRealtime();
                    if ( currentTime - this.startTime > HEARING_DURATION )
                    {
                        this.mode = "sleeping";
                        this.recognizeOn = false;
                    }
                }
                break;

            case "waking":
                this.currentEyes = EYES_STARS;
                this.toSay = "Weee?";
                this.nextMode = "connect";
                this.mode = "talking";
                break;

            case "talking":
                this.currentEyes = EYES_OO;
                break;

            case "connect":
                this.toSay = "Connecting...";
                this.currentEyes = EYES_STARS;
                this.nextMode = "talking";
                this.mode = "talking";
                this.connect = true;
                break;

            case "connected":
                this.toSay = this.response;
                this.response = "";
                this.currentEyes = EYES_OO;
                this.nextMode = "listening";
                this.mode = "talking";
                break;

            case "cannotconnect":
                this.toSay = "Sorry, I cannot connect to my server...";
                this.currentEyes = EYES_PLUS;
                this.nextMode = "sleeping";
                this.mode = "talking";
                break;

            case "listening":
                this.currentEyes = EYES_oo;
                this.recognizeOn = true;
                if ( !this.userInput.equals( "" ) )
                {
                    this.recognizeOn = false;
                    this.toAsk = this.userInput;
                    this.userInput = "";
                    this.mode = "waiting";
                }
                else
                {
                    long currentTime = elapsedRealtime();
                    if ( currentTime - this.startTime > LISTENING_DURATION )
                    {
                        this.mode = "sleeping";
                        this.recognizeOn = false;
                    }
                }
                break;

            case "waiting":
                this.currentEyes = EYES_STARS;
                this.recognizeOn = false;
                if ( !this.response.equals( "" ) )
                {
                    this.toSay = this.response;
                    this.response = "";
                    this.nextMode = "listening";
                    this.mode = "talking";
                }
                else
                {
                    long currentTime = elapsedRealtime();
                    if ( currentTime - this.startTime > WAITING_DURATION )
                    {
                        this.mode = "sleeping";
                        this.recognizeOn = false;
                    }
                }
                break;
        }
        runOnUiThread( new SelfRunnable( this ) );
        return 0;
    }

    public void checkEyes( MainActivity self )
    {
        if ( self.oldEyes != self.currentEyes )
        {
            self.eyes.setText( self.animationChars, self.currentEyes, 2 );
            self.oldEyes = self.currentEyes;
            self.leftBracket.setText( "(" );
            self.rightBracket.setText( ")" );
        }
    }
    public void handleSpeech( MainActivity self )
    {
        if ( self.toSay != "" && self.saying == "" )
        {
            self.saying = "awi" + self.speechCount++;
            self.textToSpeech.speak( self.toSay, TextToSpeech.QUEUE_FLUSH,null , self.saying );
            self.toSay = "";
        }
    }
    public void handleRecognition( MainActivity self )
    {
        if ( self.recognizeOn != self.oldRecognizeOn )
        {
            self.oldRecognizeOn = self.recognizeOn;
            if ( self.recognizeOn )
            {
                self.userInput = "";
                self.speechRecognizer.startListening( self.speechRecognizerIntent );
                self.startTime = elapsedRealtime();
            }
            else
            {
                self.speechRecognizer.stopListening();
                self.userInput = "";
            }
        }
    }
    public void handleAsk( MainActivity self )
    {
        if ( !self.toAsk.equals( "" ) )
        {
            String message = "";
            message += "{";
            message +=      "'handle':'" + self.connectionHandle + "',";
            message +=      "'command':'ask',";
            message +=      "'data':{";
            message +=          "'prompt':'" + self.toAsk + "',";
            message +=          "'parameters':{},";
            message +=          "'control':{}";
            message +=      "}";
            message += "}";
            message = self.toJSON( message );
            self.ws.sendText( message );
            self.toAsk = "";
            self.startTime = elapsedRealtime();
            return;
        }
    }
    public void handleWebSocket( MainActivity self )
    {
        if ( self.connect != self.connected )
        {
            if ( self.connect )
            {
                if ( self.connecting == 0 )
                {
                    self.connecting++;
                    WebSocketFactory factory = new WebSocketFactory();
                    try
                    {
                        self.ws = factory.createSocket( URL, WSTIMEOUT );
                    } catch ( IOException e ) {
                        throw new RuntimeException(e);
                    }

                    self.ws.addListener( new WebSocketAdapter()
                    {
                        // A text message arrived from the server.
                        public void onTextMessage( WebSocket websocket, String message )
                        {
                            JSONObject msg;
                            try
                            {
                                msg = new JSONObject( message );
                            }
                            catch( JSONException e )
                            {
                                return;
                            }
                            if ( self.connecting == 2 )
                            {
                                String handle = "";
                                try
                                {
                                    handle = msg.getJSONObject( "data" ).getString( "handle" );
                                }
                                catch( JSONException e )
                                {
                                    return;
                                }
                                self.connectionHandle = handle;
                                String answer = "";
                                answer += "{";
                                answer +=      "'handle':'" + handle + "',";
                                answer +=      "'command':'ask',";
                                answer +=      "'data':{";
                                answer +=          "'prompt':'francois',";
                                answer +=          "'parameters':{},";
                                answer +=          "'control':{}";
                                answer +=      "}";
                                answer += "}";
                                answer = self.toJSON( answer );
                                self.ws.sendText( answer );
                                self.connecting++;
                                return;
    						}
                            else if( self.connecting == 3 )
                            {
                                // Connected!
                                self.connecting = 0;
                                self.connected = true;
                                self.mode = "connected";
                            }

                            // Store normal response.
                            self.response = "";
                            try
                            {
                                self.response = msg.getJSONObject( "data" ).getString( "textClean" );
                            }
                            catch( JSONException e )
                            {
                                return;
                            }
                        }
                        public void onConnected( WebSocket websocket, Map<String, List<String>> headers )
                        {
                            String message = "";
                            message += "{";
                            message +=      "'command':'connect',";
                            message +=      "'data':{";
                            message +=          "'config':{";
                            message +=              "'prompt':'',";
                            message +=              "'connectors':[";
                            message +=                  "{ 'name': 'systems.node', 'options': {}, 'default': true },";
                            message +=                  "{ 'name': 'utilities.utilities', 'options': {}, 'default': true },";
                            message +=                  "{ 'name': 'utilities.time', 'options': {}, 'default': true },";
                            message +=                  "{ 'name': 'utilities.parser', 'options': {}, 'default': true },";
                            message +=                  "{ 'name': 'clients.openainode', 'options': {}, 'default': true },";
                            message +=                  "{ 'name': 'languages.javascript', 'options': {}, 'default': true },";
                            message +=                  "{ 'name': 'importers.*', 'options': {} } ]";
                            message +=          "},";
                            message +=          "'key':'aoz'";
                            message +=      "}";
                            message += "}";
                            message = self.toJSON( message );
                            self.ws.sendText( message );
                            self.connecting++;
                        }
                        public void onError( WebSocket websocket, WebSocketException cause )
                        {
                            self.connected = false;
                            self.connecting = 0;
                            self.connect = false;
                            self.mode = "cannotconnect";
                        }
                    } );
                    self.ws.addExtension( WebSocketExtension.PERMESSAGE_DEFLATE );
                    try
                    {
                        self.ws.connect();
                    } catch ( com.neovisionaries.ws.client.WebSocketException e ) {
                        self.connected = false;
                        self.connecting = 0;
                        self.connect = false;
                        self.mode = "cannotconnect";
                    } catch ( Exception e )
                    {
                        self.connected = false;
                        self.connecting = 0;
                        self.connect = false;
                        self.mode = "cannotconnect";
                    }
                }
            }
            else
            {
                this.connected = false;
                this.connecting = 0;
                this.connect = false;
                this.ws.disconnect();
            }
        }
    }
    public String toJSON( String message )
    {
        return message.replace( "'", "\"" );
    }
}

class SelfRunnable implements Runnable
{
    private MainActivity self;

    public SelfRunnable( MainActivity it )
    {
        this.self = it;
    }

    @Override
    public void run()
    {
        this.self.checkEyes( this.self );
        this.self.handleRecognition( this.self );
        this.self.handleSpeech( this.self );
    }
}
