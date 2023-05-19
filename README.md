```
                                             / \
                                            / _ \               (°°)        Intelligent
                                           / ___ \ [ \ [ \  [ \[    ]       Programmable
                                         _/ /   \ \_\  \/\ \/ / |  | \      Personal 
                                     (_)|____| |____|\__/\__/  [_||_] \     Assistant
```

# Awi

- ## I.ntelligent 

- ## P.rogrammable 

- ## P.ersonal 

- ## A.ssistant

By Francois Lionet (c) 2023

This project is open-source under the terms described in the licence file located at the root of the project.

------

##### What is AWI?

Awi is a digital assistant, similar to Google Home or Alexa with the possibility of being programmed by the user himself and not only programmers, based on Open-AI Chat GPT3.5 for this version.

It is open-source and can be used for free by individual and families, makers, makers-clubs labs, schools etc. (please read the licence ;) ... to make robots, drive LEDs, implement local or distant digital assistants, intelligent shop online bots, digital secretaries... and even games and applications. 

It can be seen as an intermediate between a programming language like Javascript or Python and a strict digital assistant like Chat-GPT : it is a digital assistant that can DO things... What I call a "soft" programming language that will accept commands like "please loop what we did above 10 times" instead of "For N = 1 To 10/Next".

It is written in Javascript under node.js, and can be converted to browser code with a utility (under development).

It's structure is completely open with connectors, classes that isolate the engine, the brain, from the outside, allowing Awi to be installed and communicate with virtually everything, be installed on phones , PC, watches Arduinos (when a C version is done ;) Raspberries etc., or as a server on a local or distant, small or big network.

Throughout conversations, step by step, the user performs a task, like make a document, create a project, find information, make a game, etc... Awi has a set a pre-made commands to perform the basic tasks, search, view, edit, run, import, list (more to come).  It does an initial parse of the user input to decide whether or not call Open-AI. Exchange after exchange, "bubbles" of conversation after bubble of conversation, the goal is reached and the whole conversation can be saved as a new command with parameters that will be recognised as a simple task by the parser and executed next time. The textual description of the new command that you can add will then be included in the virtual brain: your version of Awi will be more intelligent after learning from you.

Then you will be able to buy or sell pre-made commands in a future bubble-shop.

Or transpile it into a real working game and application with Awi's runtime "The Tree Engine".

A complete presentation of the engine can be found here: 

<https://drive.google.com/file/d/1wJuHco7r6hR1uGldxQ7nyFThc8-J1-BL/view?usp=sharing>

##### How to install?

Awi has only been tested on Windows and it certainly will not work today on other platforms.

Clone the project on your machine at the root of your C:/ drive. It has not been tested at another location.

If you use Visual Studio Code, you can open the project and press F5 to launch the engine.

If not, simply open a CLI in C:\Awi and type: 

```
node simple-node-prompt 
```

On first launch, Awi will ask for your first and last name and for your Open-AI key. You can skip this step and not input any key, in this case you will only be able to use local commands.

##### How to use?

Simply type your text and <ENTER>

Commands like "list *.png" will be executed immediately. In a later version you will be able to type command with style, like "please find all images", this text being converted internally by the initial parser to "find *.png"

If the text is not a command, it is sent to Open-Ai with formatting instruction inserted in the prompt, segments of recalled memories and previous conversations, personality indications etc.

You can watch a short presentation of what works today here: <LINK>

##### Documentation

I will soon generate a documentation from all the information contained in all the bubbles.

For the moment, documentation on the Awi class and how to launch Awi.

**class Awi**

The "Awi" class is the entry point of the engine. Constructor:

**= new Awi( config, options = {} )**

Parameters:

**config** (object)

- ​      **prompt** (string) : the iniital prompt. Can be the name of the user for instant connection.

- ​      **configurations** (string):  path to the folder where configuration files are stored.

- ​      **engine** (string) : path to the "awi-engine" folder.

- ​      **data** (string) : path to the folder where documents to be digested are dropped.

- ​      **connectors** (array) : list of default and optional connectors to load and use.

  - **connectorDefinition** (object) : information about the connector,

    ***name*** (string) : the long name of the connector ('class.token', example 'utilities.awi')

    ***options*** (object) : connector initialization options

    ***default*** (boolean) : true if default, false if not

**options** (object)

- not used for the moment.

```
var awiawi = require( './awi-engine/awi' );

var config =
{
    prompt: '',
    configurations: thispath + '/configs',
    engine: thispath + '/awi-engine',
    data: thispath + '/data',
    connectors: 
    [
        { name: 'systems.node', options: {}, default: true },
        { name: 'utilities.awi', options: {}, default: true },
        { name: 'clients.openainode', options: {}, default: true },
        { name: 'editors.commandline', options: {}, default: true },
        { name: 'languages.aoz', options: {}, default: true },
        { name: 'importers.*', options: {} },
    ],
};
async function startAwi( prompt, config )
{
	var data = {};
	var control = {};
	var awi = new awiawi.Awi( config );
	var answer = await awi.connect( {} );
	if ( answer.success )
	{
		setTimeout( async function()
		{
			await awi.prompt.prompt( prompt, data, control );
		}, 1000 )
	}
}

```

The code listed above shows the proper way to start the engine. Awi constructor first loads the system configuration file, then the defaults connectors. For initialization to perform properly, the order of the connectors is important, and there must be a connector for each "default" section, like utilities, system, editor, language.

Once all elements for the system to run are loaded and connected, it then loads the user configuration files and optional connectors. 

The next step is to scan all the files located in the awi-engine/bubbles folder and instanciate them. All the commands are now ready. Then load all memories and souvenirs.

The engine is now ready, the initial prompt is displayed with information about the connectors (client connector will only be ok when a user is connected).

**The Tree Engine**

You will find in the project a -for the moment- empty sub-project named "tree-engine". The Tree Engine is a project I developed at Friend Software Labs in Norway in 2018. "The Game Engine that Mimics Nature". It was dropped as I did the wrong choices at start and it became too complicated at the end. I have learned from my mistakes ... "why make complicated when you can make simple" ;)   More info soon...

**Make your own connectors and bubbles, participate to the project...**

Awi is so open-ended that I am focussing on making today a small-shop digital-assistant, to be installed on the local network, that will provide tremendous help to the shop-owner by finding files, invoices, recalling conversations with clients, managing files and prices etc. Also at the same time, an application of Awi as a intelligent teacher for an English company.

But Awi can be much more, specially in hardware, with Arduino/Raspberry connectors, connected to devices like Alexa or Google Home, installed on your PC as a magical assistant that will make your life so much easier -specially if you do not really understand computers-, installed in a classroom with Aoz Studio and robots, etc. The list of possible applications is just too long.

I will soon release videos on how to create new connectors and new bubbles, it is really simple.

##### Please support the project.

Patreon: [Francois Lionet | creating AMOS-2 | Patreon](https://www.patreon.com/francoislionet)
Facebook: [Francois Lionet | Facebook](https://www.facebook.com/francois.lionet.33)
Discord: Awi Discord server to come.



