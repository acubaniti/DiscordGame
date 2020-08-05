//None of these commands actually work. Disabling them for now
exports.commands = [
 
	"kick", 
	"clear", 
	"svinfo",
	"info",
	"warn",
	// "prune",

]


function usersOnline(server){
	var online = 0;
	for(var i = 0; i < server.members.length; i++){
		if(server.members[i].status != 'offline') online += 1;
	}
	return online;
}

function resolveMention(usertxt){
	var userid = usertxt;
	if(usertxt.startsWith('<@!')){
		userid = usertxt.substr(3,usertxt.length-4);
	} else {
		if(usertxt.startsWith('<@')){
			userid = usertxt.substr(2,usertxt.length-3);
		}
	}
	return userid;
}

function resolveUser(msgContext,usertxt){
	try {
	var userid = usertxt;
	if(usertxt.startsWith('<@')){
		userid = usertxt.substr(2,usertxt.length-3);
	}
	var user = msgContext.guild.members.get(userid);
	/*if(!user){
		var users = msg.guild.members.findAll("username",usertxt);
		if(users.length == 1){
			user = users[0];
		} else {
			return null;
		}
	}*/
	return user;
	}catch(e){
		console.error(e);
	}
} 

exports.kick = {
	usage: "<user>",
	description: "Kick a user with a message! Requires both the author of the message and the bot to have kick permission",
	process: function(bot,msg,suffix) {
		let args = suffix.split(" ");
		if(args.length > 0 && args[0]){
			//first check if the bot can kick
			let hasPermissonToKick =  msg.guild.members.get(bot.user.id).permissions.has("KICK_MEMBERS");
			if(!hasPermissonToKick){
				msg.channel.send( "I don't have permission to kick people!");
				return;
			}
			//now check if the user can kick
			if(!msg.guild.members.get(msg.author.id).permissions.has("KICK_MEMBERS")){
				msg.channel.send( "You don't have permission to kick people!");
				return;
			}
			var targetId = resolveMention(args[0]);
			let target = msg.guild.members.get(targetId);
			if(target != undefined){
				if(!target.kickable){
					msg.channel.send("I can't kick " + target + ". Do they have the same or a higher role than me?");
					return;
				}
				if(args.length > 1) {
					let reason = args.slice(1).join(" ");
					target.kick(reason).then(x => {
						msg.channel.send("Kicking " + target + " from " + msg.guild + " for " + reason + "!");
					}).catch(err => msg.channel.send("Kicking " + target + " failed:\n"));
				} else {
					target.kick().then(x => {
						msg.channel.send("Kicking " + target + " from " + msg.guild + "!");
					}).catch(err => msg.channel.send("Kicking " + target + " failed:\n"));
				}
			} else {
				msg.channel.send("I couldn't find a user " + args[0]);
			}
		} else {
			msg.channel.send("You must specify a user to kick!");
		}
	}
},
exports.clear ={
	usage: "",
	description: "Clears last x messages",
	process: function(bot,msg,suffix) {
        msg.channel.bulkDelete(20); 
    }

},
// exports.prune ={
// 	usage: "",
// 	description: "Logs server info",
// 		process: function(bot,msg,suffix) {
// 		let args = suffix.split(" ");
// 		if(args.length > 0 && args[0]){
// 			//first check if the bot can kick
// 			let hasPermissonToKick =  msg.guild.members.get(bot.user.id).permissions.has("KICK_MEMBERS");
// 			if(!hasPermissonToKick){
// 				msg.channel.send( "I don't have permission to kick people!");
// 				return;
// 			}
// 			//now check if the user can kick
// 			if(!msg.guild.members.get(msg.author.id).permissions.has("KICK_MEMBERS")){
// 				msg.channel.send( "You don't have permission to kick people!");
// 				return;
// 			}
// 			var idleDays = args[0]; 
// 			if(idleDays != undefined && idleDays > 7){ 
// 			// Actually prune the members
// 			guild.members.prune({ days: idleDays, reason: 'Inactivitate! Hai inapoi cand vrei sa participi' })
// 			  .then(pruned => console.log(`I just pruned ${pruned} people!`))
// 			  .catch(console.error);
	

// 			} else {
// 				msg.channel.send("Eroare " + args[0]);
// 			}
// 		} else {
// 	// See how many members will be pruned
// 	guild.members.prune({ dry: true })
// 	  .then(pruned => console.log(`This will prune ${pruned} people!`))
// 	  .catch(console.error);

// 		}
// 	}

	 
// },
exports.info = {	
	usage: "<user>",
	description: "get user info",
	process: function(bot,msg,suffix) {
		let args = suffix.split(" ");
		if(args.length > 0 && args[0]){
			//first check if the bot can kick
			let hasPermissonToKick =  msg.guild.members.get(bot.user.id).permissions.has("KICK_MEMBERS");
			if(!hasPermissonToKick){
				msg.channel.send( "I don't have permission to kick people!");
				return;
			}
			//now check if the user can kick
			if(!msg.guild.members.get(msg.author.id).permissions.has("KICK_MEMBERS")){
				msg.channel.send( "You don't have permission to kick people!");
				return;
			}
			var targetId = resolveMention(args[0]);
			let target = msg.guild.members.get(targetId);
			if(target != undefined){
				// if(!target.kickable){
				// 	msg.channel.send("I can't kick " + target + ". Do they have the same or a higher role than me?");
				// 	return;
				// }

				msg.delete().then(msg.channel.send("Fisierul de la securitate despre **" + target.displayName + "**\nMembru de la: " + target.joinedAt + "\nPe discord de la: " + target.createdAt + "\nUltimul mesaj: " + target.lastMessage + "\nPremium de la: " + target.premiumSince + "\nRoluri: " + target.roles.toString()));

			} else {
				msg.delete().then(msg.channel.send("I couldn't find a user " + args[0]));
			}
		} else {
			msg.delete().then(msg.channel.send(`Server name: ${msg.guild.name}\nTotal members: ${msg.guild.memberCount}\nCreated at: ${msg.guild.createdAt}\nExplicit filter: ${msg.guild.explicitContentFilter}\nVanity URL: ${msg.guild.vanityURLCode}`));
	 
		}
	}
},
exports.warn = {	
	usage: "<user>",
	description: "warn user",
	process: function(bot,msg,suffix) { 
		let args = suffix.split(" ");
		var targetId = resolveMention(args[0]);
		let target = msg.guild.members.get(targetId);

	  let dmsEmbed = new Discord.RichEmbed()
	  .setTitle("Warn")
	  .setColor("#00ff00")
	  .setDescription(`You have been warned on \`${message.guild.name}\``)
	  .addField("Warned by", message.author.tag)
	  .addField("Reason", reason);

	  // target.send(dmsEmbed);

	  // msg.delete();
	  
	  // msg.channel.send(`${user.tag} has been warned`)

}}
