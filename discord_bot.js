var fs = require('fs');

process.on('unhandledRejection', (reason) => {
  console.error(reason);
  process.exit(1);
});

try {
	var Discord = require("discord.js");
} catch (e){
	console.log(e.stack);
	console.log(process.version);
	console.log("Please run npm install and ensure it passes with no errors!"); // if there is an error, tell to install dependencies.
	process.exit();
}
console.log("Starting DiscordBot\nNode version: " + process.version + "\nDiscord.js version: " + Discord.version); // send message notifying bot boot-up



// Get authentication data
try {
	var AuthDetails = require("./auth.json");
} catch (e){
	console.log("Please create an auth.json like auth.json.example with a bot token or an email and password.\n"+e.stack); // send message for error - no token 
	process.exit(); 
}
// Load custom permissions
var dangerousCommands = ["uptime", "ping", "idle", "online", "clear", "addmeme", "alias", "idle", "online", "memes" ]; // set array if dangerous commands
var Permissions = {};
try{
	Permissions = require("./permissions.json");
} catch(e){
	Permissions.global = {};
	Permissions.users = {};
}

for( var i=0; i<dangerousCommands.length;i++ ){
	var cmd = dangerousCommands[i];
	if(!Permissions.global.hasOwnProperty(cmd)){
		Permissions.global[cmd] = false;
	}
}
Permissions.checkPermission = function (userid,permission){
	//var usn = user.username + "#" + user.discriminator;
	//console.log("Checking " + permission + " permission for " + usn);
	try {
		var allowed = true;
		try{
			if(Permissions.global.hasOwnProperty(permission)){
				allowed = Permissions.global[permission] === true;
			}
		} catch(e){}
		try{
			if(Permissions.users[userid].hasOwnProperty("*")){
				allowed = Permissions.users[userid]["*"] === true;
			}
			if(Permissions.users[userid].hasOwnProperty(permission)){
				allowed = Permissions.users[userid][permission] === true;
			}
		} catch(e){}
		return allowed;
	} catch(e){}
	return false;
}
fs.writeFile("./permissions.json",JSON.stringify(Permissions,null,2), (err) => {
	if(err) console.error(err);
});

//load config data
var Config = {};
try{
	Config = require("./config.json");
} catch(e){ //no config file, use defaults
	Config.debug = false;
	Config.commandPrefix = '!';
	try{
		if(fs.lstatSync("./config.json").isFile()){ // open config file
			console.log("WARNING: config.json found but we couldn't read it!\n" + e.stack); // corrupted config file
		}
	} catch(e2){
		fs.writeFile("./config.json",JSON.stringify(Config,null,2), (err) => {
			if(err) console.error(err);
		});
	}
}
if(!Config.hasOwnProperty("commandPrefix")){
	Config.commandPrefix = '!'; // set bots prefix
}

var messagebox;
var aliases;
try{
	aliases = require("./alias.json");
} catch(e) {
	//No aliases defined
	aliases = {};
}

commands = {	// all commands list below
	"alias": {
		usage: "<name> <actual command>",
		description: "Creates command aliases. Useful for making simple commands on the fly.",
		process: function(bot,msg,suffix) {
			var args = suffix.split(" ");
			var name = args.shift();
			if(!name){
				msg.channel.send(Config.commandPrefix + "alias " + this.usage + "\n" + this.description);
			} else if(commands[name] || name === "help"){
				msg.channel.send("overwriting commands with aliases is not allowed!");
			} else {
				var command = args.shift();
				aliases[name] = [command, args.join(" ")];
				//now save the new alias
				require("fs").writeFile("./alias.json",JSON.stringify(aliases,null,2), null);
				msg.channel.send("created alias " + name);
			}
		}
	},
	"aliases": {
		description: "Lists all recorded aliases.",
		process: function(bot, msg, suffix) {
			var text = "current aliases:\n";
			for(var a in aliases){
				if(typeof a === 'string')
					text += a + " ";
			}
			msg.channel.send(text);
		}
	},
    "ping": {
        description: "Responds pong; useful for checking if bot is alive.",
        // cooldown: 5,
        process: function(bot, msg, suffix) {
            msg.channel.send( msg.author+" pong!");
            if(suffix){
                msg.channel.send( "Note that !ping takes no arguments!");

            }
        }
    },
    "idle": {
		usage: "[status]",
        description: "Sets bot status to idle.",
        process: function(bot,msg,suffix){ 
	    bot.user.setStatus("idle").then(console.log).catch(console.error);
	}
    },
    "online": {
		usage: "[status]",
        description: "Sets bot status to online.",
        process: function(bot,msg,suffix){ 
	    bot.user.setStatus("online").then(console.log).catch(console.error);
	}
    },
    "say": {
        usage: "<message>",
        description: "Bot sends message",
        process: function(bot,msg,suffix){ msg.delete().then(msg.channel.send(suffix));}
    },
 
 
};

if(AuthDetails.hasOwnProperty("client_id")){
	commands["invite"] = {
		description: "Generates an invite link you can use to invite the bot to your server.",
		process: function(bot,msg,suffix){
			msg.channel.send("Invite link: https://discordapp.com/oauth2/authorize?&client_id=" + AuthDetails.client_id + "&scope=bot&permissions=470019135"); // send link to invite bot into server.
		}
	}
}

 

var bot = new Discord.Client();

var hooks = {
	onMessage: []
}

bot.on("ready", function () {
	console.log("Logged in! Currently serving " + bot.guilds.array().length + " servers.");
	require("./plugins.js").init(hooks);
	console.log("Type "+Config.commandPrefix+"help on Discord for a command list.");
});

bot.on("disconnected", function () {

	console.log("Disconnected!"); // send message that bot has disconnected.
	process.exit(1); //exit node.js with an error

});

function checkMessageForCommand(msg, isEdit) {
	//check if message is a command
	if(msg.author.id != bot.user.id && (msg.content.startsWith(Config.commandPrefix))){
        console.log("treating " + msg.content + " from " + msg.author + " as command");
		var cmdTxt = msg.content.split(" ")[0].substring(Config.commandPrefix.length);
        var suffix = msg.content.substring(cmdTxt.length+Config.commandPrefix.length+1);//add one for the ! and one for the space
        if(msg.isMentioned(bot.user)){
			try {
				cmdTxt = msg.content.split(" ")[1];
				suffix = msg.content.substring(bot.user.mention().length+cmdTxt.length+Config.commandPrefix.length+1);
			} catch(e){ //no command 
				return false;
			}
        }
		alias = aliases[cmdTxt];
		if(alias){
			console.log(cmdTxt + " is an alias, constructed command is " + alias.join(" ") + " " + suffix);
			cmdTxt = alias[0];
			suffix = alias[1] + " " + suffix;
		}
		var cmd = commands[cmdTxt];
        if(cmdTxt === "help"){
            //help is special since it iterates over the other commands
			if(suffix){
				var cmds = suffix.split(" ").filter(function(cmd){return commands[cmd]});
				var info = "";
				for(var i=0;i<cmds.length;i++) {
					var cmd = cmds[i];
					info += "**"+Config.commandPrefix + cmd+"**";
					var usage = commands[cmd].usage;
					if(usage){
						info += " " + usage;
					}
					var description = commands[cmd].description;
					if(description instanceof Function){
						description = description();
					}
					if(description){
						info += "\n\t" + description;
					}
					info += "\n"
				}
				msg.channel.send(info);
			} else {
				msg.author.send("**Available Commands:**").then(function(){
					var batch = "";
					var sortedCommands = Object.keys(commands).sort();
					for(var i in sortedCommands) {
						var cmd = sortedCommands[i];
						var info = "**"+Config.commandPrefix + cmd+"**";
						var usage = commands[cmd].usage;
						if(usage){
							info += " " + usage;
						}
						var description = commands[cmd].description;
						if(description instanceof Function){
							description = description();
						}
						if(description){
							info += "\n\t" + description;
						}
						var newBatch = batch + "\n" + info;
						if(newBatch.length > (1024 - 8)){ //limit message length
							msg.author.send(batch);
							batch = info;
						} else {
							batch = newBatch
						}
					}
					if(batch.length > 0){
						msg.author.send(batch);
					}
				});
			}
			return true;
        }
		else if(cmd) {
			if(Permissions.checkPermission(msg.author.id,cmdTxt)){
				try{
					cmd.process(bot,msg,suffix,isEdit);
				} catch(e){
					var msgTxt = "command " + cmdTxt + " failed :(";
					if(Config.debug){
						 msgTxt += "\n" + e.stack;
						 console.log(msgTxt);
					}
					if(msgTxt.length > (1024 - 8)){ //Truncate the stack if it's too long for a discord message
						msgTxt = msgTxt.substr(0,1024-8);
					}
					msg.channel.send(msgTxt);
				}
			} else {
				msg.channel.send("You are not allowed to run " + cmdTxt + "!");
			}
			return true;
		} else {
			msg.channel.send(cmdTxt + " is not not recognized as a command!").then((message => message.delete(5000)))
			return true;
		}
	} else {
		//message is not a command or is from us
        //drop our own messages to prevent feedback loops
        if(msg.author == bot.user){
            return true; //returning true to prevent feedback from commands
        }

        if (msg.author != bot.user && msg.isMentioned(bot.user)) {
        		var vadimQuotes = [
        		"Aşa cum Austria e o ţară de doctori, România e o ţară de preşedinţi – fiecare neisprăvit e preşedinte pe undeva.",
        		"Recunosc că în materie de politică sunt zero. Kilometrul zero, am vrut să spun.",
        		"Am consultat un medic: era grav bolnav!",
        		"Nu pot sta trei români pe aceeaşi cracă! Unul dintre ei trebuie s-o taie cu fierăstrăul, chiar cu riscul de a-şi rupe şi el gâtul.",
        		"Într-o Revoluţie, puterea n-o iau furioşii, ci calculaţii – este, de altfel, singurul moment când leii sunt mâncaţi de şacali.",
        		"Ignoranţa ne costă mai scump decât educaţia.",
        		"La declaraţia de avere falsă, a politicienilor, Poporul răspunde cu o declaraţie de sărăcie autentică.",
        		"Nimic nu plictiseşte mai mult decât perfecţiunea.",
        		"Luaţi voi leul greu, mie daţi-mi dolarul uşor.",
        		"Dragostea la prima vedere este, întotdeauna, oarbă.",
        		"Dintre toţi duşmanii, cei mai periculoşi sunt foştii prieteni.",
        		"Gura sobei - televizorul Evului Mediu.",
        		"Politica e arta de a sta la pândă.",
        		"Revoluţiile schimbă lumea, dar nu pot modifica nici cel mai mic tabiet.",
        		"Toate popoarele acordă un mare respect Bisericii şi Armatei. Adică exact acelor instituţii unde n-are voie să pătrundă democraţia.",
        		"Podul care leagă Yalta de Malta este creionul albastru al lui Winston Churchill.",
        		"Revoluţiile schimbă lumea, dar nu pot modifica nici cel mai mic tabiet.",
        		"Mai bine să regrete lumea că ai murit, decât că ai trăit prea mult.",
        		"Pitica nenoricita, uita-te in oglinda! Nici liftul nu pleaca cu tine, pitica dracu!",
        		"Pământul e plin de oameni fără Dumnezeu, care trăiesc mai rău ca animalele: mănâncă, beau, se împerchează, îşi fac nevoile, adună averi, uneori calcă pe cadavre, se agită bezmetic, n-au nici un ideal, iar când îi loveşte necazul urlă şi îşi smulg părul din cap. Poate că Dumnezeu îi îngăduie tocmai ca, în comparaţie cu ei, să se vadă mai bine măreţia sfinţilor.",
        		"Fugiţi de omul isteric ca de un bolnav contagios! Mai devreme sau mai târziu, o să vă facă să ajungeţi mai isterici ca el.",
        		"Aforismul este calea prin care unii vor să intre în istoria culturii pe scurtătură.",
        		"Lovitura de stat se repetă: s-a mişcat poporul!",
        		"Pe zi ce trece, proştii fac progrese: devin şi mai proşti!",
        		"Politicienii români s-au modernizat: au renunţat la coloana vertebrală pentru coloana oficială.",
        		"Lucrul cel mai imoral din lume este să fii bogat într-o ţară săracă. Indiferent ce justificări îţi creezi, ţara e săracă şi din pricina ta.",
        		"Mersi, Securitate! În lipsa unui biograf, tu mi-ai scris viaţa.",
        		"În România contemporană a apărut o specie de haiduc invers: ia de la săraci şi dă la bogaţi.",
        		"Chinezii şi germanii - două popoare care nu fac nimic inutil.",
        		"Fara marele învins Napoleon, n-ar fi auzit nimeni de micul învingător Wellington.",
        		"Crima organizată? În sfârşit, bine că avem şi noi ceva organizat în ţara asta.",
        		"Marile 'şcoli de hoţi' nu sunt puşcăriile, ci familiile de bogătaşi. Ele fac un imens rău nu numai pentru că fură, ci şi pentru că livrează societăţii copii gata corupţi.",
        		"La Judecata de Apoi mi-am angajat cei mai buni avocaţi: genunchii mei!",
        		"Programul unui guvern nu trebuie să se vadă la televizor, ci la un alt aparat casnic: în frigider.",
        		"E prea mult pentru o generaţie: să moară şi de foame, şi de ruşine.",
        		"Nu ţiganul se îneacă la mal, ci românul.",
        		"Putem ierta chiar şi un criminal, dar vom ţine minte, toată viaţa, pe cineva care ne-a trântit telefonul în nas.",
        		"Privesc pe ecranul unui ecograf, la organele mele interne. 'Unul din voi mă va vinde!' - spun şi eu, ca Mântuitorul, gândindu-mă care dintre ele mă va răpune.",
        		"Dacă Einstein nu era evreu, Teoria Relativităţii nu se bucura de mai multă atenţie decât Teoria Chibritului.",
        		"Hai, daţi-mi repede Premiul Nobel, până nu mă răzgândesc!",
        		"Nicolae Ceauşescu n-a fost asasinat pentru greşelile sale, ci pentru meritele sale.",
        		"Oamenii de paie riscă să fie mâncaţi de orice măgar.",
        		"Emil Cioran nici acum, după moarte, nu s-a hotărât ce rol să joace în tabla de valori: sfânt sau sfincter.",
        		];
				var vadimQuote = Math.floor(Math.random() * vadimQuotes.length);
				msg.channel.send(vadimQuotes[vadimQuote]); //using a mention here can lead to looping

        } else if(Math.floor(Math.random() * 15) == 1){
        				function randomDrop() {
				    var dropRange = [ 
				        "🥇",
				        "🥈",
				        "🥉",
				        "🦽",

				    ]; 
				    var r = Math.floor(Math.random() * dropRange.length);
				    msg.react(dropRange[r])
				    .catch(() => console.error('One of the emojis failed to react.'));
}  
				randomDrop(); 
        }

        else { 
				}

		return false;
    }
}

bot.on("message", (msg) => {
	if(!checkMessageForCommand(msg, false)){
		for(msgListener of hooks.onMessage){
			msgListener(msg);
		}
	}
});

bot.on("messageUpdate", (oldMessage, newMessage) => {
	checkMessageForCommand(newMessage,true);
});

//  On user join
 bot.on('guildMemberAdd', member => {
    member.guild.channels.get('710765073915838506').send('**' + member.user.username + '** a intrat pe server.'); 
    member.send(" :crown: Welcome to Chill Place :crown:\n\n    1. No Child Pornography\n    2. No Illegal shit\n    3. No exaggerated bullying/being an asshole\n\n:underage: This is an adult server, no kids allowed :underage:\n                             Have fun!")
    .catch(() => console.error('Was unable to send welcome message to joining member.'));


});	

// On user leave
bot.on('guildMemberRemove', member => {
    member.guild.channels.get('710765073915838506').send('**' + member.user.username + '**, a fost prins de jandarmi noaptea pe strada.');
    

    //	
});

// //Log user status changes
// bot.on("presence", function(user,status,gameId) {	
// 	//if(status === "online"){
// 	//console.log("presence update");
// 	console.log(user+" went "+status);
// 	//}
// 	try{
// 	if(status != 'offline'){
// 		if(messagebox.hasOwnProperty(user.id)){
// 			console.log("Found message for " + user.id);
// 			var message = messagebox[user.id];	
// 			var channel = bot.channels.get("id",message.channel);
// 			delete messagebox[user.id];
// 			updateMessagebox();
// 			bot.send(channel,messageUpdateage.content);
// 		}
// 	}
// 	}catch(e){}
// });


exports.addCommand = function(commandName, commandObject){
    try {
        commands[commandName] = commandObject;
    } catch(err){
        console.log(err);
    }
}
exports.commandCount = function(){
    return Object.keys(commands).length;
}
if(AuthDetails.bot_token){
	console.log("logging in with token");
	bot.login(AuthDetails.bot_token);
} else {
	console.log("Logging in with user credentials is no longer supported!\nYou can use token based log in with a user account; see\nhttps://discord.js.org/#/docs/main/master/general/updating.");
}
