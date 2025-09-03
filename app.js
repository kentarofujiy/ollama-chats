import { createApp, reactive, computed, ref, nextTick, inject, provide } from 'vue';

window.app = createApp({
			template: '#tmplChat',
			data() {
				return {
					def: {},
					prompt: '',
					groups: [],
					group: 0,
					groupAddN: '',
					context: { 1: true, 2: true, 0: false, 3: true },
					turns: [
						{
							"role": 'root',
							'branch': 0,
							'branches': [{
								msg: 0, msgs: [{
									"content": '',
									"nick": '',
									"nicks": {},
									"nId": -1,
									an: {}
								}]
							}],
							'tree': { 0: { 0: 0 } },//parent's branch:{selected msg:local branch growing from that msg}
						},
					],
					models: [],
					modelsEmb: [{
						tag: 'nomic-embed-text:latest',
						n: 'nomic-embed-text:latest (hardcoded)',
						mt: null,
						s: null,
						ps: null,
						q: null,
						ctx: null,
						emb: true
					}],
					modelsLoading: { done: 0, total: 0, inited: 0 },
					pState: {
						sys: 1,
						instr: 0,
						sets: 0,
						pull: 0,
						howto: 0,
						optHelp: 0,
						opt: 0,
						menu: 1,
						control: 1,
						ragU: 0,
						ragG: 0,
						charNew: 0,
						ragMemGen: 0,
						cardSave: 0,
					},
					configGroups: {
						ver: { name: 'Version' },
						url: { name: 'Connection settings' },
						logic: { name: 'Chat logic features' },
						stories: { name: 'Stories features' },
						rag: { name: 'Memories (rag) features' },
						rating: { name: 'Rating features' },
						design: { name: 'Design features' },
						ui: { name: 'User interface features' },
						reply: { name: 'Reply cleaning features' },
						imgs: { name: 'Vision features' },
						ollama: { name: 'Ollama settings' },
					},
					configGlobal: {
						version: { g: 'ver', name: 'Version', v: '1.9.10', def: '', d: 'UI version, just for information and upgrades', 'f': 'ro', qn: 'ver', q: null, opt: false },
						themeWhite: { g: 'design', name: 'Invert colors', v: false, d: "Inverted colors, if you are weird person preferring white backgrounds, you may check this. But it looks scary, beware.", def: false, f: 'cb', q: false, qn: 'clrs', opt: false },

						raw: { g: 'logic', name: 'Raw mode', v: false, def: false, d: "Raw mode. Don't use it, unless you know what you are doing. The template can be edited in the respective configuration field. Please note: Ollama doesn't support token count api and doesn't cut the log in raw mode, therefore it's impossible to implement proper context size. In other words, once your log is longer than context window, things will break.", f: 'cb', q: false, qn: 'raw', opt: true },
						rawTmpl: {
							g: 'logic', name: 'Raw mode template', v: `{{img}}[img-{{imgIndex}}]{{/img}}

{{start}}<|start_header_id|>system<|end_header_id|>\n\n{{sys}}<|eot_id|>{{/start}}

{{user}}<|start_header_id|>user<|end_header_id|>\n\n{{img}}{{msg}}<|eot_id|>\n{{/user}}

{{assistant}}<|start_header_id|>assistant<|end_header_id|>\n\n{{msg}}<|eot_id|>\n{{/assistant}}

{{singleMsgMode}}{{img}}{{msg}}

{{/singleMsgMode}}

{{end}}<|start_header_id|>assistant<|end_header_id|>{{/end}}`, def: '\n{{img}}[img-{{imgIndex}}]{{/img}}\n{{start}}<|start_header_id|>system<|end_header_id|>\n\n{{sys}}<|eot_id|>{{/start}}\n{{user}}<|start_header_id|>user<|end_header_id|>\n\n{{msg}}<|eot_id|>\n{{/user}}\n{{assistant}}<|start_header_id|>assistant<|end_header_id|>\n\n{{msg}}<|eot_id|>\n{{/assistant}}\n{{singleMsgMode}}{{img}}{{msg}}\n\n{{/singleMsgMode}}\n{{end}}<|start_header_id|>assistant<|end_header_id|>{{/end}}', d: `Raw mode template. Template has six parts:
				
{{start}} your start of the template {{/start}}
Text between these will be used at the start of the template. message related variables are not accessible here, as no message is processed yet.

{{user}} your line for every user message {{/user}}
Once start text is inserted, it will loop over each message in the log. The text between these will be inserted for every message originating from a user character. In a single message mode it will wrap all messages joined by singleMsgMode template, in that case previous message data here is empty as it's the "first message" and current user data equals to the "replyTo" data.
				
{{assistant}} for every AI character message {{/assistant}}
Same but for every message originating from an AI character.

{{singleMsgMode}} for every message if single message mode enabled{{/singleMsgMode}}
If you have single message mode enabled in settings (chat logic), all messages are joined into one and then packed into "user" template above. Here you can define how each message will look like within single "user" container. If single message mode is off, it's not used.

{{end}} final part of the template {{/end}}
Once log message is over, this part will finish the template. Current message text is empty, current char data equals to replier, previous message is the last one in the log.

{{img}}[img-{{imgIndex}}]{{/img}}
When you add images they should be attached to a certain message. To do that a template [img-0] is usually used, where 0 is index of the image. For example, in llama.cpp (used by ollama) all the text _before_ [img-N] (down to previous [img-N]) is used as a prefix for the image. Therefore it makes sense to put it into the end of the message. However, there is a thing i believe is a bug, if you have certain symbols in the prefix, like ":", everything is broken. That is why it is easier to put the placeholder into beginning of the message right now. This placeholder will replace the {{img}} in the messages loop. In other parts it is not used. {{imgIndex}} is automatically replaced with the id of the image in array that is sent to the server.'. 

All 6 parts should be there even if some are empty. Please note, certain chat modes add messages to the end of chat log, to additionally instruct your model.

Template variables:

{{replierId}},{{replierName}
Id and name of the ai character that will generate new reply
	
{{replyToUserId}},{{replyToName}},{{replyToText}}
Id, name and text of the message AI will generate a reply to. Depending on the setting "Prevent ReplyTo template to refer to own msg" it might be last message in the chat, or last message in the chat not belonging to the character that will reply.
	
{{replyToTextRaw}}
Same, but without mods (like: "Name:", rating marks, etc), it's message text "as is"
	
{{sys}}
System prompt
	
{{charId}},{{charName}},{{msg}},{{msgRaw}}
Respective data of a particular message in the log that is processed
	
{{charIdPrev}},{{charNamePrev}},{{msgPrev}},{{msgRawPrev}}
Same but for previous message in the log

{{img}}
Replaced by the image template above to attach an image to a message
	
When there is no appropriate data, the value is empty. Variable names case sensitive.

				`, f: 'tb', q: false, qn: 'rawTmpl', opt: false
						},
						rawLog: { g: 'logic', name: 'Raw mode log', v: false, def: false, d: "To ease understanding of what's going on, you can enable this to see the template construction steps in the browser console.", f: 'cb', q: false, qn: 'rawLog', opt: false },

						trinity: { g: 'logic', name: 'Trinity: thinking/action reply mechanism', v: true, def: true, d: "A big problem with regular chats is that model posts thoughts and actions in the same reply and other characters can read these, even when they are not supposed to know the thoughts of another person. Also, often models omit to write their thinking which is the most curious part in replies for me, or they write thinking part but omit the action part. This is the solution to overcome these, coming at a cost of a little slow down in generation. Model is instructed to produce thoughts/feelings and actions separately, then these are stored in a way that other ai characters see only the actions part, while you see all of these. If you switch it off in the middle of a chat, chat log will use the full messages as usually. Please note, usual mode and trinity modes have separate data, so editing in one mode doesn't change data stored in another mode. P.S. It's called trinity because originally i also experimented with separating emotions but it didn't add anything interesting to the chat, so i removed it.", f: 'cb', q: true, qn: '3ty', opt: true },
						trinityReqTh: { g: 'logic', name: 'Request to be sent to generate thoughts', v: 'Now, in-character of {{replierName}} with above in mind, write only what you think and feel (up to 100 words) about """{{replyToText}}""", nothing else, no comments, no notes, no dialogues, only the thoughts.', def: 'Now, in-character of {{replierName}} with above in mind, write only what you think and feel (up to 100 words) about """{{replyToText}}""", nothing else, no comments, no notes, no dialogues, only the thoughts.', d: "This is the instruction sent for model to generate the thinking/feeling reaction towards last text. {{replierName}} is replaced with the name of the character that speaks and {{replyToText}} is replaced with the text of the message it replies to (it's required because otherwise model might be confused what to reply about, considering there might be various instructions injected into chat log)", f: 'ta', q: false, qn: '3tyTh', opt: false },
						trinityReqA: { g: 'logic', name: 'Request to be sent to generate actions', v: 'Now, {{replierName}}, in-character with your system prompt and with things you said above, react with actions/words (if you will) at """{{replyToText}}""", up to 100 words.', def: 'Now, {{replierName}}, in-character with your system prompt and with things you said above, react with actions/words (if you will) at """{{replyToText}}""", up to 100 words.', d: "This is the instruction sent for model to generate the outer reaction towards last text. {{replierName}} is replaced with the name of the character that speaks and {{replyToText}} is replaced with the text of the message it replies to (it's required because otherwise model might be confused what to reply about, considering there might be various instructions injected into chat log)", f: 'ta', q: false, qn: '3tyA', opt: false },
						trinityChancesTh: { g: 'logic', name: 'Chances to see thoughts of AI', v: 0.5, def: 0.5, d: "This sets the chance for model to produce the internal thoughts in addition to actions. Originally i had this at 100% but models repeat things too much, so i got an idea to show their thinking only at times. Number should between 0 and 1. 0 means you will never see the thoughts, 1 means you will always see them. 0.3 means 1/3 of replies will have it. As the chances are random, it's only approximate probability, while even with low chances you may get several thoughtful replies in a line.", f: '', q: false, qn: '3ThCh', opt: true },
						trinityOwCOnOff: { g: 'logic', name: 'On switching off trinity overwrite data with that from trinity', v: false, def: false, d: "If you use trinity generated data is duplicated into non-trinity mode. However, you might edit the replies as you chat, then data in original version is outdated. This will overwrite data in normal mode with everything you have in trinity mode, every time when you disable trinity. Note, reverse process is impossible, so edits in normal mode is not copied to trinity because we don't know what is thoughts and what is action there. It's off by default, because you could use main mode as default one with edits and then switching trinity on/off would erase all of your changes in normal mode.", f: 'cb', q: false, qn: '3tyOW', opt: false },

						rooms: { g: 'logic', name: 'Use single prompt to send the chat', v: false, def: false, d: "If true, all messages are concatenated and sent to AI as one big prompt, AI will take all the chat as a single input prompt generated by user. If it's off, chat is sent as a set of messages, then AI can see which messages were created by AI and which ones by user. Which one is better depends on the model.", f: 'cb', q: false, qn: 'sngl', opt: true },
						otherAiAsUser: { g: 'logic', name: 'Other AI personages are "users" for AI', v: true, d: "When multi-message mode is used to send chat log to AI (that is single-message format is off) mark messages of other AI characters as created by the user. If you have 3 personages, only the current character's messages are marked for AI as AI generated ones. Experimental thing, i think the reaction will be model dependant.", def: true, f: 'cb', q: false, qn: 'ai usr', opt: true },
						sysNick: { g: 'logic', name: 'System nick instructing model', v: 'World', d: "Sometimes we inject special messages into the stuff sent to AI. For example, rating instructions. To do that we need to have some name of the user sending it. We could do it on behalf of AI but it's less flexible. This is the nick of that 'special person' that injects hidden messages for AI.", def: 'World', f: '', q: false, qn: 's-nick', opt: false },
						noAiReplyToSelf: { g: 'logic', name: 'Prevent replying of ai to self', v: true, d: "Sometimes it may happen that last message belongs to ai and you expect it to write more. If you just send an empty message, and before that there was always strict order of user/ai turns, AI will try to keep the pattern and reply on behalf of a user, ignoring its system prompt. If you have 'instruction' or 'trinity' it has way less chances to happen as there are additional messages instructing AI how to reply. But if you don't have these, it might be very irritating. To fix that, this will add a message from the system user 'World', it will ask model to continue in accordance with the system prompt. Then Ai will answer for itself with a much higher chances.", def: true, f: 'cb', q: false, qn: 'aiNoSlfRp', opt: true },
						noReplyToSelf: { g: 'logic', name: 'Prevent ReplyTo template to refer to own msg', d: "Templating in trinity and raw modes has 'ReplyTo' placeholder which refers to last message in the log. But sometimes it might be the own message of an AI, to prevent AI to react to its own last message, mark this. Then it will search for last message belonging to someone else and use it as 'ReplyTo' content. If there is none, it will be empty.", def: true, f: 'cb', q: false, qn: 'rpToNoSlf', opt: true },
						namesAdd: { g: 'logic', name: 'Add names', v: true, def: true, d: "If you have more than one character talking, the model can not understand well which of the messages belong to itself and which are not, despite the system prompt. To fix this, each message gets a name prefix before being sent to the model. Usually it produces much more adequate behavior during chats, even with 1 character. If you don't need that, you can switch it off here.", f: 'cb', q: false, qn: 'nmAdd', opt: true },
						emptyToSth: { g: 'logic', name: 'Replace empty messages with text', v: false, def: false, d: "If you just hit enter, it creates an empty message. By default it will be ignored and not sent, however with this 'on' empty message internally will be converted into some text, like 'Continue'. You can specify it in the settings as well.", f: 'cb', q: false, qn: 'emp2Sth', opt: true },
						emptyToTxt: { g: 'logic', name: 'Text to replace empty messages with', v: 'Continue', def: 'Continue', d: "If you just hit enter, it creates an empty message. By default it will be ignored and not sent, however if you have 'Replace empty message with text' setting on, it will replace it with this text internally. Original log is unchanged, so every time you change this, all empty messages will get new content within new request.", f: '', q: false, qn: 'emp2Txt', opt: false },

						//didn't work well, hidden
						aiIsYou: { g: 'logic', name: 'Ai is named "You"', v: false, def: false, d: "If Ai character changes name during the story, it confuses model. This will always you 'You' as model's name, which should help model to undersand which messages belong to it, despite the changes in name of its character.", f: 'cb', q: false, qn: 'aiYou', opt: true, hidden: true },

						stories: { g: 'stories', name: 'Stories: separate context memory per character', v: false, d: "In all of the other UI i know (on the moment of writing this) characters see all of the chat history. I came up with a new idea, with this feature every personage can have each own context within the chat. For example, you may talk to a character A and do various things. Then you can introduce character B and that character will not know anything about things you did with character A. Every message is marked with the list of characters that can see it. You define it when you send the message for both your message and AI's one. You can see the 'access list' under every message and change it. The chat log is automatically filtered when you choose your and ai chars for the next messages. You can change the filter mode under the chat log at the right. Obvious usage for this can be: two different stories intersecting at some point, where one group plans something or does something and another doesn't know about it. A classic scenario of talking on the phone. Or when character 'thinks' and you don't want other characters to know these thoughts, you can with one click remove them from the message's access list. In other words, it makes it possible to simulate real stories and there is no more need to persuade AI that it shouldn't be aware of something in the chat log :). It comes at a cost of more complicated interface. I've spent a lot of time, much more than coding, on coming up with this interface, to make it as convenient as possible and intuitive. It's still harder than usual one but i believe it's a good one and trust me, as obvious as it seems when you see it, it wasn't easy to form the idea into UI :). Turning this off will disable all existing limits and all characters will see everything.", def: false, f: 'cb', q: false, qn: 'strz', opt: true },
						storiesUI: { g: 'stories', name: 'Show stories UI', v: false, d: "Show or hide stories interface without disabling it under the hood. If you wish it to work but don't want to see it all the time, just disable it here. If you turn it on, it will automatically turn on the stories feature as well, to prevent the confusion. Stories feature is separate context per character, every message can have its own list of characters that can 'know/see' it.", def: false, f: 'cb', q: true, qn: 'strz-ui', opt: false },

						rag: { g: 'rag', name: 'Use memories (rag)', v: 'true', d: 'You can add unlimited memories to your characters by inserting it into rag field (Shift+F4, Shift+F5) but sometimes it causes repeatitive answers as AI tends to like replying in likeness to that data. Also, you may wish to turn it off if you do not have a second instand of Ollama running, as it would wipe the cache at every usage and getting new replies would be slow. Normally, you need to run second Ollama for embeddings calculations and configure it with URL for embeddings, then it shall work very fast.', def: true, f: 'cb', q: true, qn: 'rag', opt: true },
						ragUAmount: { g: 'rag', name: 'Number of personal memories (rag lines) to use', v: 3, d: "Seaching in the memory of a character (rag) returns all of its content by separate paragraphs (lines) sorted by relevance, but the model can't remember everything, so we can't feed model with all that info. We have to choose only a certain number of top relevant (hopefully) lines found in memories. This value defines how many top relevant memory lines we will feed to the model before it replies.", def: 3, f: '', q: false, qn: 'ragUAmnt', opt: true },
						ragGAmount: { g: 'rag', name: 'Number of public knowledge (rag lines) to use', v: 2, d: "Seaching in a public knowledge (rag) accesible to all characters returns all of its content by separate paragraphs (lines) sorted by relevance, but the model can't remember everything, so we can't feed model with all that info. We have to choose only a certain number of top relevant (hopefully) lines found in knowledge. This value defines how many top relevant lines we will feed to the model before it replies.", def: 3, f: '', q: false, qn: 'ragGAmnt', opt: true },
						ragMinSmlr: { g: 'rag', name: 'Minimum required similarity value for rag', v: 0.45, d: "When you use memories/knowledge (rag) each line of your data stored there is returned with certain index of similarity, that is, how similar it is to your prompt. We return only N top most relevant entries, but even so they might be not relevant at all if memories have just nothing alike. In that case you can filter these off by setting minimal requires similarity level here. I set a default value to 0.45 to filter out most obvious unrelated stuff, but to be honest it can't be predefined as different embedding models have different scales, so you might need to check this yourself by looking at 'Remembered' section of memories panel during your chat. It also depends on how well you write the data for character memories, if you don't have enough generic synonyms there, the relevance will be slow. But in any case, here it is for you to use if needed. If it's empty, it's not used.", def: '0.45', f: '', q: false, qn: 'ragMinSmlr', opt: true },
						ragPast: { g: 'rag', name: 'Number of past chat messages for similarity search in memories (rag)', v: 2, d: "Using a single message to search in memories is fine with documents but is totally not enough for chats. Imagine your last message is just 'what?!' and nothing is found in rag relevant to that. To fix this, you can set how many last messages are going to be used for searching for something similar. But don't set it high as there is a limit to how much embedding model can make sense of. 2-3 messages is the best, i believe. 2 would mean your prompt + the last message from chat.", def: 2, f: '', q: false, qn: 'ragpast', opt: true },
						ragShuffle: { g: 'rag', name: 'Shuffle found top memories randomly', v: false, d: "To add randomness you can shuffle found top memories before adding them to AI's 'head'. It may make replies more random but at the cost of longer wait for a side-reply, as model will have to recalculate longer text each time instead of just using cache from the last attempt.", def: true, f: 'cb', q: false, qn: 'ragShfl', opt: true },

						hideEmptyOwn: { g: 'ui', name: 'Hide own empty replies', v: true, def: 1, d: 'Hide own empty replies (the ones where you just clicked enter). Setting this to false can be useful if you wish to branch a conversation at a turn of your empty reply. Otherwise these just irritate.', 'f': 'cb', q: true, qn: 'no emp', opt: false },
						showEmptyOwnSide: { g: 'ui', name: 'Force show own empty replies when there are side-replies', v: true, def: true, d: `Show own empty replies if there are alternative side-replies available, even if hideEmptyOwn is true. Otherwise you wouldn't be able to see prev/next branches if you've sent an empty message, because there would be no 'crossroads' message shown.`, 'f': 'ro', opt: false },
						setsQ: { g: 'ui', name: 'Show quick settings', v: true, d: "Shows fields for quick access to settings that you often mayy change. You can configure which one are in the list in settings.", def: true, f: 'cb', q: null, opt: false },
						fKeys: { g: 'ui', name: 'Enable F1-F10 keyboard keys for menu', v: true, d: "Allows you to access the bottom menu functions with F1-F10 keys of your keyboard. You can disable it if you don't want to lose 'F5' for page reloading, etc", def: true, f: 'cb', q: false, qn: 'Fs', opt: false },
						tokensCount: { g: 'ui', name: 'Show token counts reported by ollama', v: false, d: 'Show the count of tokens in messages. As it\'s broken in Ollama, disabled by default. Stores tokens per model as these differ.', def: false, f: 'cb', q: false, qn: 'tkns', opt: false },
						setsDescrShow: { g: 'ui', name: "Show descriptions for configuration values", v: true, d: "Enables showing descriptions for each parameter below parameter's name, otherwise shows only as a tooltip.", def: true, f: 'cb', q: null, opt: false },

						imgsLastOnly: { g: 'imgs', name: 'Send last message images only', v: true, d: "If this is checked, only the images added to your last (current) prompt are sent to AI. Otherwise all images from the chat history are sent. It's implemented as sending all images takes a lot of time for AI to re-evaluate them, also, when you use a single-message mode for the chat, there is no way to embed images into the middle of conversation and they all are perceived as the last ones. To avoid these rakes i've set this to 'true' by default.", def: true, f: 'cb', q: false, qn: 'imgLast', opt: true },

						emojiNo: { g: 'reply', name: 'Auto-remove emojis', v: false, def: false, d: "Erase emojis from model's output", f: "cb", q: false, qn: 'noemj', opt: false },
						resClean: { g: 'reply', name: 'Auto-clean reply from junk', v: true, d: "Should the reply be auto-cleaned of 'Name: ' and other known garbage.", def: true, f: 'cb', q: false, qn: 'cln', opt: false },
						resBufCleanSize: { g: 'reply', name: 'Buffer size before printing reply', v: 10, d: "Buffer size that should be filled before it starts showing your the reply. It's needed to prevent jerking of the reply when we clean it from the litter of names and other marks.", def: 10, f: '', q: null, opt: false },

						bgImg: { g: 'design', name: 'Background image', d: "You can load background image. If you use inverted colors scheme, you've to load an image with inverted colors ;)", def: '', f: 'file', q: null, opt: false, unload: true, sess: false, v: 'https://picsum.photos/1920/1080' },
						bgFixed: { g: 'design', name: 'Fix background image position', v: true, d: "You can make the background image fixed or repeated vertically, as you like more. If this one is disabled, it's repeated. To make image look seemless in this case you can vertically mirror it at stitch to the bottom of your original image.", def: true, f: 'cb', q: 'bgFix', opt: false },
						msgFontSize: { g: 'design', name: 'Font size of the message text', v: '14px', d: 'Font size of the message text. As it modifies the inline style and not the css itself, it might be slow on big chats and slow computers.', def: '14px', f: '', q: null, opt: false },
						taFontSize: { g: 'design', name: 'Font size of the input text areas', v: '14px', d: 'Font size of the text in prompt, instr and system prompt text areas.', def: '14px', f: '', q: null, opt: false },
						chatHeight: { g: 'design', name: 'Height of the chat log', v: '', d: "If you prefer a fixed chat log height with a scroller inside, set this to the desired height of your chat log. The valus is in pixels, use only a number, like '300'.", def: '', f: '', q: 'logHeigh', opt: false },

						url: { g: 'url', name: 'URL', v: "http://127.0.0.1:11434", def: 'http://127.0.0.1:11434', d: 'URL of the Ollama service or OpenRouter API (https://openrouter.ai/api/v1)', q: null, opt: false, sess: true },
						urlEmb: { g: 'url', name: 'Embeddings instance URL', v: "http://127.0.0.1:11434", def: 'http://127.0.0.1:11434', d: "URL of the Ollama service to use for embeddings calculations. It can be the same but in that case every such request clears cache and causes prompt re-evaluation, so caching doesn't work with rag. I recommend running a second instance of Ollama on another port to handle embeddings.", q: null, opt: false, sess: true },
						apiKey: { g: 'url', name: 'API Key', v: "", def: '', d: 'API Key for OpenRouter (required when using OpenRouter API). Leave empty for local Ollama.', q: null, opt: false, sess: true },

						instrWithSideRating: { g: 'rating', name: 'Stil use "instr" for side-replies when side-rating is on ', v: true, d: "Shoud your instruction (instr) be used when you request side-message with rated examples (ctrl+right). Instruction may interefere with the examples as AI gets confused with what you want from it, there are bad examples, good examples and also an instruction for new reply, not mentioning the context. You may switch this off. It has effect only when you request for rated side-replies, otherwise this setting is not used.", def: true, f: 'cb', q: false, qn: 's-rate', opt: false },
						badExForSideReply: { g: 'rating', name: 'Use that many -ed side replies for new ones', v: 3, d: 'When you ask for one more side message from AI clicking ">", you just get a reply generated on the context above. But if you click "ctrl+right", your rated messages are shown to AI as examples. However, showing many negative ones may have the opposite effect as AI just starts copying them. This number defines how many random bad messages from your last turn should be given to AI as an example of how it shouldn\'t talk. Also, setting this high will result in a serious reduction of context window memory. 0 means disable.', def: 3, f: '', q: false, qn: 'b-ex', opt: false },
						goodExForSideReply: { g: 'rating', name: 'Use that many +ed side replies for new ones', v: 3, d: 'Same as above, but for messages with good rating. Unlike with bad messages it is ok to have a lot of these but remember it eats the context memory. Unless you have unlimited vram, don\'t set this high. 0 means disabled.', def: 3, f: '', q: false, qn: 'g-ex', opt: false },
						replyWithRating: { g: 'rating', name: 'Use rating to instruct model', v: true, d: "Should attempt to instruct model to use the existing rated messages as style examples for replies. Some models react well, some do not. If you didn't rate any answers in the current branch, nothing is changed in the prompt, so if you don't use the rating and do not wish to pollute the prompt, no need to switch it off.", def: true, f: 'cb', q: false, qn: 'rate', opt: true },
					},
					settingsGlobal: {
						options: {
							temperature: { g: 'ollama', v: '', t: 'n', def: 0.8, d: 'The temperature of the model. Increasing the temperature will make the model answer more creatively. (Default: 0.8)', q: true, qn: 'temp', opt: true },
							num_ctx: { g: 'ollama', v: '', t: 'n', def: 2048, d: 'Sets the size of the context window used to generate the next token. (Default: 2048)', q: true, qn: 'ctx', opt: true },
							top_k: { g: 'ollama', v: '', t: 'n', def: 40, d: 'Reduces the probability of generating nonsense. A higher value (e.g. 100) will give more diverse answers, while a lower value (e.g. 10) will be more conservative. (Default: 40)', q: true, opt: true },
							top_p: { g: 'ollama', v: '', t: 'n', def: 0.9, d: 'Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text. (Default: 0.9)', q: true, opt: true },
							num_thread: { g: 'ollama', v: '', t: 'n', def: '', d: 'Sets the number of threads to use during computation. By default, Ollama will detect this for optimal performance. It is recommended to set this value to the number of physical CPU cores your system has (as opposed to the logical number of cores).', q: false, qn: 'thr', opt: true },
							repeat_last_n: { g: 'ollama', v: '', t: 'n', def: 64, d: 'Sets how far back for the model to look back to prevent repetition. (Default: 64, 0 = disabled, -1 = num_ctx)', q: true, qn: 'rep_l', opt: true },
							repeat_penalty: { g: 'ollama', v: '', t: 'n', def: 1.1, d: 'Sets how strongly to penalize repetitions. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient. (Default: 1.1)', q: true, qn: 'rep_p', opt: true },
							mirostat: { g: 'ollama', v: '', t: 'n', def: 0, d: 'Enable Mirostat sampling for controlling perplexity. (default: 0, 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0)', q: false, qn: 'm-t', opt: true },
							mirostat_eta: { g: 'ollama', v: '', t: 'n', def: 0.1, d: 'Influences how quickly the algorithm responds to feedback from the generated text. A lower learning rate will result in slower adjustments, while a higher learning rate will make the algorithm more responsive. (Default: 0.1)', q: false, qn: 'm-eta', opt: true },
							mirostat_tau: { g: 'ollama', v: '', t: 'n', def: 5, d: 'Controls the balance between coherence and diversity of the output. A lower value will result in more focused and coherent text. (Default: 5.0)', q: false, qn: 'm-tau', opt: true },
							num_gqa: { g: 'ollama', v: '', t: 'n', def: '', d: 'The number of GQA groups in the transformer layer. Required for some models, for example it is 8 for llama2:70b', q: false, qn: 'gqa', opt: true },
							num_gpu: { g: 'ollama', v: '', t: 'n', def: '', d: 'The number of layers to send to the GPU(s). On macOS it defaults to 1 to enable metal support, 0 to disable.', q: false, qn: 'gpu', opt: true },
							stop: { g: 'ollama', v: [''], t: 'as', def: '', d: 'Sets the stop sequences to use. When this pattern is encountered the LLM will stop generating text and return. Multiple stop patterns may be set by specifying multiple separate stop parameters in a modelfile. Each input here means one stop match', f: 'mis', q: null, opt: false },
							tfs_z: { g: 'ollama', v: '', t: 'n', def: 1, d: 'Tail free sampling is used to reduce the impact of less probable tokens from the output. A higher value (e.g., 2.0) will reduce the impact more, while a value of 1.0 disables this setting. (default: 1)', q: false, opt: true },
							num_predict: { g: 'ollama', v: '', t: 'n', def: 128, d: 'Maximum number of tokens to predict when generating text. (Default: 128, -1 = infinite generation, -2 = fill context)', qn: 'prdct', q: false, opt: false },
							seed: { g: 'ollama', v: '', t: 'n', def: 0, d: 'Sets the random number seed to use for generation. Setting this to a specific number will make the model generate the same text for the same prompt. (Default: 0)', qn: 'seed', q: false, opt: true },
						},
						req: {
							model: { g: 'ollama', v: { l: computed(() => this.models), v: '' }, t: 'sel', def: 0, d: 'Model that will generate the reply', f: 'sel', q: true, qn: 'mdl', opt: false, sess: 'v' },
							keep_alive: { g: 'ollama', v: 900, t: 'n', def: "300", d: 'Time to keep model cached in memory, a number in seconds, any negative number will keep the model loaded in memory, 0 will unload the model immediately after generating a response.', q: false, qn: 'k-alv', opt: false },
							modelEmb: { g: 'ollama', v: { l: computed(() => this.modelsEmb), v: '' }, t: 'sel', def: 0, d: 'Model that will generate the embeddings for rag search', f: 'sel', q: false, qn: 'mdl-emb', opt: false, sess: 'v' },
						}
					},
					stream: true,
					nick: {
						s: -1,
						n: {
							u: '',
							a: '',
							s: '',
						}
					},
					amountNicks: { u: 0, a: 0, t: 0, s: 1, idNext: 0 },
					nicks: {
						'-1': { t: 's', n: computed(() => this.config.sysNick.v), id: '-1' },
					},
					msgUserListOn: {},
					opt: { 'v': {}, model: 0, run: false, cancel: false },
					rag: {},
					turn: 0,
					cancel: 0,
					working: 0,
					workingRag: 0,
					connection: 0,
					connectionErr: '',
					modelPull: 'stablelm2',
					mpull: [],
					ctrl: 0,
					log: 0,
					chatHeight: '300',
					imgs: [],
					inited: 0,
					branchMoving: false,
					memNew: {
						working: 0,
						cancel: 0,
						sys: [],
						parts: {},
						sys: [
							{
								sys: `Replies should be strictly in the format: "<memory>generated memory</memory>". Your goal is to create the requested amount of a random yet consistent memories of a given person from the input data. Be creative and deep in psychology. It should be consistent with the data provided. Each memory should include the person's name. Each memory should be phrased in a first person. Each memory should have a lot of synonyms. Each one of the created memories should strictly be in this format: "<memory>generated memory</memory>".`,
								req: [{
									req: 'Input data:\n{PARAMS}',
									t: 'Initial request'
								}, {
									req: 'Ready to generate.',
									t: `Model's "reply" before specific requests`,
								}, {
									req: 'Now generate {AMOUNT} memories about: """{TOPIC}""". Consistent with everything above. clearly state the age in each memory. Format should be: "<memory>generated memory</memory>',
									t: 'Topic specific requests'
								}]
							}
						],
					},
					charNew: {
						step: 0,
						stepShow: 0,
						working: 0,
						cancel: 0,
						u: null,
						sys: [
							{
								sys: `This is for a computer game plot, so it's okay. You reply in the following strict format only: "<parameter_name>parameter value</parameter_name>".\nYour task is to create a set of new random yet fully consistent parameters defining a new person, combining each and all of the following key personal qualities: {COREPARAMS}.\nParameters to create (you have to do all of the parameters):\n{PARAMS}`,
								req: [{
									req: `please create a new system prompt strictly in the required format. Use these presets: {PARAMS}`,
									t: "initial request",
								}, {
									req: `Please use the data above and generate the following parameters:\n{PARAMS}`,
									t: "follow up request if something was missing",
								}
								]
							}, {
								//					sys:`Your goal is to take input data and creatively rewrite it in a free form as a system prompt for the character.\nThe character's personality can vary from evil-terrible to great-saint but should clearly match each and every one of the key qualities defined in the input data.\nTake special care to make sure all of the key qualities are reflected throughout the system prompt you make.\nAs the first line of generated system prompt it should clearly tell "You are: name", throughout the text use second person addressing only.\nSecond paragraph devote to key qualities of the person.\nWhole text should have only factual information from the data provided, nothing else.\nThe size of a resulting text should be around 10000 symbols.\nIn the end of system prompt make up a description of character's psychological conflict in character's psyche using the contradictions in input data.\nBe sure to use each and every detail from the input data precisely.\nPlease put the whole resulting system prompt into "<prompt></prompt>" tag.`,
								sys: `Your goal is to take input data and creatively rewrite it in a free form as a system prompt for the person.\nThe person's personality can vary from evil-terrible to great-saint but should clearly match each and every one of the key qualities defined in the input data.\nTake special care to make sure all of the key qualities are reflected throughout the system prompt you make.\nAs the first line of generated system prompt it should clearly tell "You are: name", throughout the text use second person addressing.\nSecond paragraph devote to key qualities of the person.\nWhole text should have only factual information from the data provided, nothing else.\nThe size of a resulting text should be around 10000 symbols.\nIn the end of system prompt make up a description of person's psychological conflict in person's psyche using the contradictions in input data.\nBe sure to use each and every detail from the input data precisely.\nPlease put the whole resulting system prompt into "<prompt></prompt>" tag.`,
								req: [{
									req: 'Key qualities: {COREPARAMS}\nOther parameters:\n{PARAMS}',
									t: 'Initial request'
								}],
							}, {
								sys: `Replies should be strictly in the format: "<memory>generated memory</memory>". Your goal is to create the requested amount of a random yet consistent memories of a given person from the input data. Be creative and deep in psychology. It should be consistent with the data provided. Each memory should include the person's name. Each memory should be phrased in a first person. Each memory should have a lot of synonyms. Each one of the created memories should strictly be in this format: "<memory>generated memory</memory>".`,
								req: [{
									req: 'Input data:\n{PARAMS}',
									t: 'Initial request'
								}, {
									req: 'Ready to generate.',
									t: `Model's "reply" before specific requests`,
								}, {
									req: 'Now generate {AMOUNT} memories about: """{TOPIC}""". Consistent with everything above. clearly state the age in each memory. Format should be: "<memory>generated memory</memory>',
									t: 'Topic specific requests'
								}]
							}
						],
						parts: {},
						paramsDef: {
							epoch: { ph: 'Future intergalactict empire' },
							location: { ph: 'Holy feline empire' },
							name: { ph: '' },
							race: { ph: 'Cat daemons' },
							ethnicity: { ph: 'Siamese' },
							gender: { ph: '' },
							age: { ph: '888' },
							face: { ph: '' },
							look: { ph: '' },
							voice: { ph: '' },
							height: { ph: '' },
							weight: { ph: '' },
							hobby: { ph: '' },
							habits: { ph: '' },
							relationships: { ph: '' },
							character: { ph: '' },
							psychotype: { ph: '' },
							temperament: { ph: '' },
							dreams: { ph: '' },
							fears: { ph: '' },
							likes: { ph: '' },
							dislikes: { ph: '' },
							preferences: { ph: '' },
							'current attire': { ph: '' },
							'specific gestures': { ph: '' },
							belongings: { ph: '' },
							'other details': { ph: '' },
						},
						paramsCore: [
							{ n: 'postive', pnl: 'toxic', pnr: 'charming', min: 0, max: 11, v: 0, p: '', b: '', vp: '', vh: '' },
							{ n: 'constructive', pnl: 'destructive', pnr: 'constructive', min: 0, max: 11, v: 0, p: '', b: '', vp: '', vh: '' },
							{ n: 'honest', pnl: 'lying/deceitful/lieful', pnr: 'honest', min: 0, max: 11, v: 0, p: '', b: '', vp: '', vh: '' },
						]
					},
					cardSave: { nicks: {}, msgs: [this.cardSaveMsgsTmpl()], loading: false }
				}
			},
			computed: {
				config() {
					const u = this.userS('a');
					if (u == null) return this.configGlobal;
					if (this.nicks[u].sets) return this.nicks[u].config;
					return this.configGlobal;
				},
				settings() {
					const u = this.userS('a');
					if (u == null) return this.settingsGlobal;
					if (this.nicks[u].sets) return this.nicks[u].settings;
					return this.settingsGlobal;
				},
				branchac() {
					return this.turns[this.turn].branches[this.branch(this.turn)];
				},
			},
			created() {
				window.addEventListener('beforeunload', this.close);
			},
			mounted() {
				(async () => {
					this.w('mounting');
					this.inited = 2;

					this.charNew.parts = this.charNewTmpl(this.charNew),
						this.memNew.parts = this.memNewTmpl(this.memNew),

						this.groupAdd('Every1', []);

					await this.userAdd('u', 'User', {});
					await this.userAdd('a', 'AI', {});
					await this.userAdd('u', 'World', {});

					this.groupAdd('1st set', [0, 1, 2]);
					this.group = 1;

					for (const k in this.settings.options) {
						if (!this.settings.options[k].hasOwnProperty('name')) this.settings.options[k]["name"] = k;
					}
					for (const k in this.settings.req) {
						if (!this.settings.req[k].hasOwnProperty('name')) this.settings.req[k]["name"] = k;
					}

					this.rag['g'] = this.ragStrct();
					for (const u in this.nicks) {
						this.rag[u] = this.ragStrct();
					}

					this.bgSet(this.config.bgImg.v);
					this.bgFix(this.config.bgFixed.v);

					this.charCreateReset(this.charNew);

					let def = {};
					for (const k in this.$data) {
						this.copy(this.$data, def, k);
					} this.def = def;

					this.sessLoad();
					this.urlTest().then(res => {
						this.inited = 1;
					});

					window.addEventListener("keyup", (event) => {
						this.ctrl = ((event.ctrlKey || event.metaKey) ? this.ctrl : 0);
					});
					window.addEventListener("keydown", (event) => {
						if (this.opt.run) return;

						this.ctrl = ((event.ctrlKey || event.metaKey) ? 1 : 0);

						const k = event.keyCode;
						this.w(`keycode detected: ${k}`);

						if (this.config.fKeys.v && k >= 112 && k < 122) { //>
							if (!event.shiftKey) {
								if (k === 112) { this.pToggle('howto') }
								else if (k === 113) { this.save() }
								else if (k === 114) { this.click('loadlabel') }
								else if (k === 115) { this.pToggle('sys') }
								else if (k === 116) { this.pToggle('instr') }
								else if (k === 117) { this.list() }
								else if (k === 118) { this.pToggle('pull') }
								else if (k === 119) { this.prune() }
								else if (k === 120) { this.pToggle('sets') }
								else if (k === 121) {
									this.quit()
								}
							} else {
								if (k === 120) { this.optToggle() }
								else if (k === 113) { this.cardSaveToggle() }
								else if (k === 114) { this.click('loadcard') }
								else if (k === 115) { this.pToggle('ragG') }
								else if (k === 116) { this.pToggle('ragU') }
								else if (k === 118) { this.pToggle("charNew") }
								else if (k === 119) { this.clear() }
							}
							event.preventDefault();
							return;
						}

						if (k == 27 && this.working == 1) {
							this.cancel = 1;
							if (this.charNew.working == 1) this.charNew.cancel = 1;
							if (this.memNew.working == 1) this.memNew.cancel = 1;
							return;
						}

						if ((document.activeElement.tagName == 'TEXTAREA' && document.activeElement.value.length) || this.turn === 0) return;
						if (document.activeElement.tagName == 'INPUT') {
							return;
						}

						if (document.activeElement.className.includes('msgText')) {
							if (event.key === 'Enter' && !event.shiftKey) {
								document.activeElement.blur();
							}
							return;
						}

						if (k == 38) {
							this.turnUp();
							return;
						} else if (k == 40) {
							this.turnDown(event.shiftKey ? 1 : 0);
							return;
						}

						if (k === 39) {
							this.listmsgs(1, this.turn, this.msga(this.turn));
						} else if (k === 37) {
							this.listmsgs(0, this.turn, this.msga(this.turn));
						}
						if (k === 46) {
							this.msgDelNext(...this.tbma(this.turn));
						}
					});

					this.w('mounted')
				})();
			},
			provide() {
				return {
					config: this.config,
					nicks: this.nicks,
					groups: this.groups,
					nick: this.nick,
					group: this.group,
					amountNicks: this.amountNicks,
				}
			},
			watch: {
				'config.themeWhite.v'(v) {
					if (v) {
						document.getElementById('html').style.filter = 'invert(100%) hue-rotate(180deg)';
					} else {
						document.getElementById('html').style.filter = 'invert(0%) hue-rotate(0deg)';
					}
				},
				'settings.req.model.v.v'(v) {
					this.w(`changed model ${v}, updating defs in settings`);
					if (!this.models.length) return;
					if (this.models[v].ctx) {
						this.settings.options.num_ctx.def = `${this.models[v].ctx} in modelfile for ${this.models[v].n}`;
					} else {
						this.settings.options.num_ctx.def = '2048';
					}
				},
				'settings.options.stop.v': {
					handler(v) {
						if (!v) return;
						if (v[v.length - 1] !== '') v.push('')
						for (let i = 0; i < (v.length - 1); i++) { //>
							if (v[i] === '') {
								v.splice(i, 1);
								i--;
							}
						}
					},
					deep: true,
				},
				'ctrl'(v) {
					this.w(`ctrl: ${v}`);
				},
				'context': {
					handler(v) {
						//this.turnLastFilteredGo();
					},
					deep: true
				},
				'config.stories.v'(v) {
					this.config.storiesUI.v = v;
				},
				'config.storiesUI.v'(v) {
					if (v) this.config.stories.v = v;
				},
				'config.bgImg.v'(v) {
					this.bgSet(v);
				},
				'config.bgFixed.v'(v) {
					this.bgFix(v);
				},
				'config.urlEmb.v'(v) {
					this.w('updating rag status as emb url changed');
					this.embed('test');
				},
				'charNew.parts.mem.custom': {
					handler(v) {
						if (!v) return;
						if (v[v.length - 1].v.length != 0) v.push({ q: 1, v: '', c: '' });
						for (let i = 0; i < (v.length - 1); i++) { //>
							v[i].q = (v[i].q + '').trim(); if (!/^(?:\d{1,4}|)$/.test(v[i].q)) v[i].q = 1;
							if (v[i].v === '') this.memSetsDel(this.charNew, i);
						}
						this.memCount(this.charNew.parts);
					},
					deep: true,
				},
				'charNew.parts.params': {
					handler(v) {
						if (!v) return;
						if (v.length == 0 || v[v.length - 1].n.length != 0) v.push({ n: '', nph: 'new custom param', ph: 'desired val or empty for random', v: '', c: '', memq: '', memt: '' });
						const rgname = new RegExp('^\s*name\s*$', 'i');

						for (let i = 0; i < (v.length - 1); i++) { //>
							if (v[i].n === '') v.splice(i, 1);
							const p = v[i];
							p.memq = (p.memq + '').trim(); if (!/^(?:\d{1,4}|)$/.test(p.memq)) p.memq = 1;
							if (p.memq != '' && p.memq > 0 && p.c.length) {
								p.memt = `${p.n}: ${p.c}`;
							} else {
								p.memt = '';
							}
							if (rgname.test(p.n)) {
								//this.w(`found name param: ${p.c}`);
								this.charNew.parts.name = v[i];
							}
						}
						this.memCount(this.charNew.parts);
					},
					deep: true,
				},
				'memNew.parts.mem.custom': {
					handler(v) {
						if (!v) return;
						if (v[v.length - 1].v.length != 0) v.push({ q: 1, v: '', c: '' });
						for (let i = 0; i < (v.length - 1); i++) { //>
							if (v[i].v === '') this.memSetsDel(this.memNew, i);
							v[i].q = (v[i].q + '').trim(); if (!/^(?:\d{1,4}|)$/.test(v[i].q)) v[i].q = 1;
						}
						this.memCount(this.memNew.parts);
					},
					deep: true,
				},
				'cardSave.msgs': {
					handler(v) {
						if (!v) return;
						if (v[v.length - 1].content.length != 0) v.push(this.cardSaveMsgsTmpl());
						for (let i = 0; i < (v.length - 1); i++) { //>
							if (v[i].content === '') v.splice(i, 1);
						}
					},
					deep: true,
				},
				'config.trinity.v'(v) {
					if (!v && this.config.trinityOwCOnOff.v) {
						this.w('Overwriting data with trinity stuff');
						for (const t of this.turns) {
							for (const b of t.branches) {
								for (const m of b.msgs) {
									this.msgContentSet(m, false, this.msgContent(m, true, -1), false);
								}
							}
						}
					}
				}
			},
			methods: {
				tbmId(t, b, m) {
					return `${t}_${b}_${m}`;
				},
				msgRole(m) {
					//this.w({msgRole:m});
					return this.nicks[m.nId].t;
				},
				cardSaveMsgsTmpl() {
					return { content: '', u: '' };
				},
				cardSaveToggle(u) {
					this.pToggle('cardSave');
				},
				cardSaveDo() {
					this.w({ cardSave: this.cardSave });
					let card = { ver: 0.1, type: 'card', chars: [], msgs: [] }, name = 'card.';
					for (const u in this.cardSave.nicks) {
						let tmp = {};
						tmp.id = u;
						tmp.n = this.nicks[u].n;
						tmp.t = this.nicks[u].t;
						tmp.system = this.nicks[u].system;
						tmp.instr = this.nicks[u].instr;
						tmp.mem = this.rag[u].t;
						tmp.knlg = this.rag.g.t;
						card.chars.push(tmp);
						name += tmp.n + '-';
					}
					if (!card.chars.length) return;
					for (const m of this.cardSave.msgs) {
						if (!m.content.length || m.u === '') continue;
						this.w({ p: this.cardSave.nicks.hasOwnProperty(m.u), n: this.cardSave.nicks[m.u] });
						if (!this.cardSave.nicks.hasOwnProperty(m.u) || !this.cardSave.nicks[m.u]) continue;
						card.msgs.push({ content: m.content, nId: m.u });
					}

					name = name.slice(0, -1);
					this.w({ SavingCard: card });
					this.saveDl(card, name);
				},
				async cardLoad(d) {
					this.w({ loadedCard: d });
					this.cardSave.loading = true;
					try {
						d = JSON.parse(atob(d.replace(/^data:\w+\/\w+;base64,/, '')));
					} catch (e) {
						this.w(`couldn't parse card ${e}`);
						alert(`Couldn't parse card.\n${e}`);
						this.cardSave.loading = false;
						return;
					}
					this.w({ card: d });
					if (d.type != 'card') {
						alert("It's not a card");
						this.cardSave.loading = false;
						return;
					}
					const pbak = this.pState.sysinstr;
					this.pState.sysinstr = false;
					let ids = {};
					for (const u of d.chars) {
						if (u.t != 'a' && u.t != 'u') continue;
						if (u.n.length > 32) continue;
						if (u.system.length > 1024 * 100) continue;
						if (u.instr.length > 1024 * 100) continue;
						if (u.mem.length > 1024 * 10000) continue;
						if (u.knlg.length > 1024 * 10000) continue;
						let id = await this.userAdd(u.t, u.n, { system: u.system, instr: u.instr, mem: u.mem, knlg: u.knlg });
						this.userGroupAdd(this.group, id);
						ids[u.id] = id;
					}

					if (d.msgs.length) {
						this.turn = 0;
						for (let mey = 0; mey < d.msgs.length; mey++) { //>
							const m = d.msgs[mey];
							if (!ids.hasOwnProperty(m.nId)) {
								this.w('Error: for some reason messag links to a non-existing user');
								continue;
							}
							const u = ids[m.nId];
							const ut = this.nicks[u].t;
							const un = (d.msgs.length - 1) > mey ? ids[d.msgs[mey + 1].nId] : null;

							if ((this.turns.length - 1) <= this.turn) { //>
								this.turnnew(this.turn, u, this.group);
								let b = this.brancha(this.turn);
								b.msgs[b.msg] = this.msgTmpl(u, m.content, this.group);
							} else {
								this.turn++;
								this.msgNew(this.turn, u, un, m.content, this.group);
							}
							this.msgaStatusSet(this.turn, 'done');
						}
						this.branchu(this.turn);
					}
					this.cardSave.loading = false;
				},
				sessLoad() {
					let sess = localStorage.getItem('sess');
					this.w({ load_session: sess });
					try {
						sess = JSON.parse(sess);
						this.w({ loaded_session: sess });
						if (sess == null) return;
						for (const s in sess) {
							for (const p in sess[s]) {
								this.sessRestoreParam(sess, s, p);
							}
						}
					} catch (e) {
						this.w(`couldn't parse session ${e}`);
					}
				},
				sessRestoreParam(sess, s, p) {
					let l = {
						cfg: this.configGlobal,
						opt: this.settingsGlobal.options,
						req: this.settingsGlobal.req,
						root: this.$data
					};
					this.w(`sess restore ${s} ${p}: ${sess[s][p]}`);
					if (s === 'root') {
						l[s][p] = sess[s][p];
					} else if (!l[s][p].sess) {
						return;
					} else if (l[s][p].sess === 'v') {
						l[s][p].v.v = sess[s][p];
					} else {
						l[s][p].v = sess[s][p];
					}
					this.w({ sess_restored: l[s] });
					//if(typeof o[p].v==="object") { o[p].v.v=sess } else { o[p].v=sess }
				},
				sessStoreParam(sess, o, p) {
					if (!o[p].sess) return;
					//const v=o[p].v;
					//sess[p]=(typeof v==="object")?v.v:v;
					if (o[p].sess === 'v') {
						sess[p] = o[p].v.v;
					} else {
						sess[p] = o[p].v;
					}
				},
				sessSave() {
					if (this.inited != 1) return;
					let sess = {};
					let store = [
						{ l: this.configGlobal, p: 'cfg' },
						{ l: this.settingsGlobal.options, p: 'opt' },
						{ l: this.settingsGlobal.req, p: 'req' }
					];
					for (const s of store) {
						sess[s.p] = {};
						for (const p in s.l) {
							this.sessStoreParam(sess[s.p], s.l, p);
						}
					}

					sess['root'] = {};
					for (let s of ['models', 'modelsEmb']) {
						(sess.root[s] = this[s]);
					}

					this.w({ sessStore: sess });

					localStorage.setItem('sess', JSON.stringify(sess));
				},
				close() {
					this.sessSave();
				},
				delAtWork(o) {
					if (o.working) {
						alert("Can't do while working");
						return 0;
					}
					return 1;
				},
				charNewSystemReset(o, id) {
					if (!this.delAtWork(o)) return;
					o.parts.system[id].sys = o.sys[id].sys;
				},
				charNewReqReset(o, id, rid) {
					if (!this.delAtWork(o)) return;
					o.parts.system[id].req[rid].req = o.sys[id].req[rid].req;
				},
				memSetsDel(o, id) {
					if (!this.delAtWork(o)) return;
					o.parts.mem.custom.splice(id, 1);
				},
				memParsedDel(o, id) {
					if (!this.delAtWork(o)) return;
					o.parts.m.splice(id, 1);
				},
				memGenParsedReset(o, f) {
					if (!f && !this.delAtWork(o)) return;
					o.parts.m = [];
					o.parts.tmp = this.msgTmpl('-1', null, 0);
				},
				charNewParamsDel(p) {
					if (!this.delAtWork(this.charNew)) return;
					if (this.charNew.parts.params[p].n == 'name' && !confirm(`Are you sure you wish to delete "name" parameter? Its value is used as the name in system prompt, in memories and at adding generated character to the system. If you delete it, system prompt will get something strange as name and the rest will use an empty value.`)) return;
					this.charNew.parts.params.splice(p, 1);
				},
				async charCreateAuto() {
					if (this.working || this.charNew.working) return;
					this.charNew.parts.auto.working = this.charNew.working = this.working = 1;
					this.charNew.parts.auto.amount = (this.charNew.parts.auto.amount + '').trim();
					if (!/^\d{1,4}$/.test(this.charNew.parts.auto.amount)) this.charNew.parts.auto.amount = 1;
					this.w(`starting doing: ${this.charNew.parts.auto.amount} characters`);
					for (let i = 1; i <= this.charNew.parts.auto.amount; i++) { //>
						this.charNew.parts.auto.at = i;
						if (this.charNew.cancel) break;
						this.w(`doing char: ${i}`);
						this.charNew.stepShow = this.charNew.step = 0;
						for (let k = 0; k <= 3; k++) { //>
							if (this.charNew.cancel) break;
							this.w(`doing char ${i}, step: ${k}`);
							await this.charCreateDo(k);
							this.scroll('charNew', 1);
							this.charNew.stepShow = this.charNew.step;
						}
					}
					this.charNew.parts.auto.at = 0;
					//this.pToggle('charNew');
					this.charNew.parts.auto.working = this.charNew.working = this.working = this.cancel = this.charNew.cancel = 0;
				},
				async charCreate(m) {
					if (this.working || this.charNew.working) return;
					this.charNew.working = this.working = 1;

					await this.charCreateDo(m);

					//this.charNew.stepShow=this.charNew.step;
					this.charNew.working = this.working = this.cancel = this.charNew.cancel = 0;
				},
				async charCreateDo(m) {
					let ms = [], req = '';
					let rgparams = new RegExp('\{PARAMS\}', 'si');
					let rgcparams = new RegExp('\{COREPARAMS\}', 'si');
					let aid = this.userS('a');

					this.charNew.stepShow = this.charNew.step = m + 1;

					if (m == 0) {
						this.w("first step of character creation");
						for (const p of this.charNew.parts.params) {
							p.c = ''; p.memt = '';
						}
						for (const p of this.charNew.parts.paramsCore) {
							this.charNewCoreParamCh(p);
						}

						let ps = '', xmpl = '', sys, paramsCount = 0;

						let rgcv = this.charNewCoreParams2p();
						for (const r of rgcv) {
							ps += `<${r.p}>${r.vh} ${r.p}</${r.p}>`;
						}

						for (let i of this.charNew.parts.params) {
							if (i.n === '' || i.n == null) continue;
							this.w(`checking param ${i.n}`);
							paramsCount++;
							xmpl += `<${i.n}>${i.n} value</${i.n}>\n`;
							if (i.v === '') continue;
							ps += `<${i.n}>${i.v}</${i.n}>\n`;
						}

						if (!paramsCount) {
							alert('You have to define at least 1 parameter to generate');
							this.charNew.step = 0;
						} else {
							this.w(`presets: ${ps}`);
							sys = this.charNew.parts.system[0].sys.replace(rgparams, xmpl).replace(rgcparams, rgcv.map(c => `"${c.vh}"`).join(", "));
							req = this.charNew.parts.system[0].req[0].req.replace(rgparams, ps);

							this.charNew.parts.tmp = this.msgTmpl('-1', null, 0);

							this.chatFinalPush(ms, {
								nId: -1,
								nick: this.nicks[-1].n,
								content: req,
								rating: '',
								images: [],
							});

							let i = 0;
							while (i++ <= 10) { //>
								if (this.charNew.cancel == 1) break;

								await this.chatSend({
									msg: this.charNew.parts.tmp,
									finalTurn: ms.length - 1,
									final: ms,
									extra: [false],
									sys: sys,
									rooms: false,
									raw: false,
									func: this.charNewParse,
									d: null,
									nicks: this.chatMsNicks({ aId: -1, uId: -1 }),
								});
								//if(i<3) this.charNew.parts.params[i].c='';
								let parsedCount = 0, parseds = '', ready = {}; req = '';
								for (const p of this.charNew.parts.params) {
									if (p.n == null || p.n === '') continue;
									this.w(`checking param ${p.n}..`);
									if (p.c != null && p.c.length > 0) {
										parsedCount++;
										this.w(`..found`);
										if (!ready[p.n]) parseds += `<${p.n}>${p.c}</${p.n}>\n`;
										ready[p.n] = 1;
									} else {
										this.w(`..absent`);
										req += `<${p.n}>generated value</${p.n}>\n`;
									}
								}
								if (!Object.keys(ready).length) continue;

								this.chatFinalPush(ms, {
									nId: aid,
									nick: this.nicks[aid].n,
									content: parseds,
									rating: '',
									images: [],
								});

								if (parsedCount == paramsCount) break;
								req = this.charNew.parts.system[0].req[1].req.replace(rgparams, req);
								this.chatFinalPush(ms, {
									nId: -1,
									nick: this.nicks[-1].n,
									content: req,
									rating: '',
									images: [],
								});
							}

							this.charNew.step = 2;
						}
					} else if (m == 1) {
						let paramsCount = 0, kq = '', ps = '';

						let rgcv = this.charNewCoreParams2p();
						this.w({ ranges: rgcv });
						kq = rgcv.map(c => `"${c.vh}"`).join(", ");

						for (const p of this.charNew.parts.params) {
							if (p.n == null || p.n === '' || p.c === '') continue;
							ps += ` ${p.n}: ${p.c}\n`;
							paramsCount++;
						}
						this.w(`found ${paramsCount} parameters`);

						if (!paramsCount) {
							alert('You have to define at least 1 parameter to generate');
							this.charNew.step = 0;
						} else {
							this.charNew.parts.sysKq = '';
							this.charNew.parts.sys = '';
							this.charNew.parts.tmp = this.msgTmpl('-1', null, 0);

							this.chatFinalPush(ms, {
								nId: -1,
								nick: this.nicks[-1].n,
								content: this.charNew.parts.system[1].req[0].req.replace(rgcparams, kq).replace(rgparams, ps),
								rating: '',
								images: [],
							});

							let i = 0;
							const rgsys = new RegExp(`<prompt>([^<]+?)</prompt>`, 'si');
							while (i++ < 10) { //>
								if (this.charNew.cancel == 1) break;
								await this.chatSend({
									msg: this.charNew.parts.tmp,
									finalTurn: ms.length - 1,
									final: ms,
									extra: [false],
									sys: this.charNew.parts.system[1].sys,
									rooms: false,
									raw: false,
									func: null,
									d: null,
									nicks: this.chatMsNicks({ aId: -1, uId: -1 }),
								});
								this.w(`got system prompt reply: ${this.charNew.parts.tmp.content}`);
								const tmp = rgsys.exec(this.charNew.parts.tmp.content);
								if (!tmp || !tmp[1] || tmp[1].trim().length < 1000) continue; //>
								this.charNew.parts.sys = tmp[1].trim();
								this.w(`got parsed system prompt: ${this.charNew.parts.sys}`);
								break;
							}

							i = 1; this.charNew.parts.sysKq = `Your key qualities:\n${rgcv.map(c => ` ${i++}. ${c.vh}`).join("\n")}\n\n`;

							if (this.charNew.parts.sys.length) {
								//this.charNew.parts.sys=`Your key qualities:\n${rgcv.map(c=>` ${i++}. ${c.vh}`).join("\n")}\n\n${this.charNew.parts.sys}\n\n`;
								this.charNew.parts.sys = `${this.charNew.parts.sys}\n\n`;
								this.charNew.parts.sys += `Specific details of ${this.charNew.parts.name.c}:\n` + this.charNew.parts.params.filter(p => p.n != null && p.n != '').map(p => ` ${p.n}: ${p.c}`).join('\n');
								this.charNew.step = 3;
							}
						}
					} else if (m == 2) {
						this.charNew.parts.tmp = this.msgTmpl('-1', null, 0);

						await this.memGen(this.charNew, this.charNew.parts.system[2], this.charNew.parts.sys);

						this.w({ memories: this.charNew.parts.m });

						this.charNew.step = 4;
					} else if (m == 3) {
						const id = await this.userAdd('a', (this.charNew.parts.name.c ?? ''), {
							system: this.charNew.parts.sysPre + this.charNew.parts.sysKq + this.charNew.parts.sys,
						});
						this.charNew.parts.copy.sysPrompt = 1;

						this.charNew.parts.u = id;
						this.charNew.parts.copy.userAdd = id;

						this.userGroupAdd(this.group, id);
						this.charNew.parts.copy.add2group = 1;

						this.groups[this.group].sel.a = id;
						this.charNew.parts.copy.select = 1;

						await this.memGen2rag(this.charNew, id);
						this.charNew.parts.copy.embedding = 1;

						this.charNew.step = 5;
						this.charNew.stepShow = 5;
					}

					if (this.charNew.step < 3) { //>
						this.charNew.parts.sysKq = '';
						this.charNew.parts.sys = '';
					}
					if (this.charNew.step < 4) { //>
						this.charNew.parts.m2do = [];
						this.charNew.parts.m = [];
					}
					if (this.charNew.step < 5) { //>
						this.charNew.parts.u = null;
						this.charNew.parts.copy = {};
					}

					this.charNew.parts.tmp = '';
				},
				charNewCoreParamCh(r) {
					this.charNewCoreParamsCalc(r);
				},
				charNewCoreParamsCalc(r) {
					let p2w = {
						100: 'ultimately, totally',
						80: 'most of the time',
						60: 'very much, casually',
						40: 'occasionaly',
						20: 'rarely, a bit',
					}, l = {}; r.c = r.v;
					if (r.c == 0) {
						r.c = this.rand(1, 11);
						this.w(`setting ${r.n} to random val: ${r.c}`);
					}
					if (r.c > 6) {
						r.b = 1;
						r.p = r.pnr;
						r.vp = (r.c - 6) * 20;
						r.vh = `${p2w[r.vp]} ${r.p} person`;;
					} else if (r.c < 6) { //>
						r.b = -1;
						r.p = r.pnl;
						r.vp = (6 - r.c) * 20;
						r.vh = `${p2w[r.vp]} ${r.p} person`;
					} else {
						r.b = 0;
						r.p = `${r.pnl}-${r.pnr}`;
						r.vp = 0;
						r.vh = `not ${r.pnl} nor ${r.pnr} person`;
					}
					this.w({ coreparamcalc: r });
					return r;
				},
				charNewCoreParams2p() {
					let rgcv = [...this.charNew.parts.paramsCore];
					rgcv.sort((a, b) => (a.b > b.b ? 1 : -1));
					this.w({ rgcv: rgcv });
					return rgcv;
				},
				charCreateReset(o, m) {
					this.w('create reset');
					if (!this.delAtWork(o)) return;

					if (m && !confirm("Are you sure you wish to delete all data in the current generation?")) return;
					this.w({ 'resetting charNew': o });
					o.step = 0;
					o.stepShow = 0;
					o.parts = this.charNewTmpl(o);
					for (const k in o.paramsDef) {
						//this.w(`copy params ${k}`);
						o.parts.params.push({
							n: k,
							ph: o.paramsDef[k].ph,
							h: o.paramsDef[k].h,
							v: '',
							c: '',
							memq: '',
							memt: ''
						});
					}
					for (const k in o.paramsCore) {
						//this.w(`copy core params ${k}`);
						this.copy(o.paramsCore, o.parts.paramsCore, k);
					}
				},
				charNewTmpl(o) {
					const mt = [
						{ q: 5, t: 'good childhood memories' },
						{ q: 5, t: 'bad childhood memories' },
						{ q: 5, t: 'memories of last years' }
					];
					let t = {
						auto: {
							amount: 1,
							working: 0,
							at: 0,
							total: 0,
						},
						u: null,
						name: '',
						copy: {},
						sys: '',
						sysKq: '',
						sysPre: `Never speak in third person about yourself! Use ONLY first person when you speak of yourself or your actions!\n\n`,
						params: [],
						paramsCore: [],
						system: [],
						req: [],
						...this.memTmpl(mt)
					};
					t.memCount.push({ l: 'params', t: 'Parameter generated memories', tref: 'params', q: 0, qp: 'memq', qv: 'memt' });
					for (const s in o.sys) {
						this.copy(o.sys, t.system, s);
					}
					this.memCount(t);
					return t;
				},
				async memGen2rag(o, u) {
					if (!o.parts.m.length) return;
					if (this.rag[u].t.length) this.rag[u].t += '\n\n';
					this.rag[u].t += `A memory of ${this.nicks[u].n}: ` + o.parts.m.join(`\n\nA memory of ${this.nicks[u].n}: `);
					await this.ragU(u);
					this.memGenParsedReset(this.memNew, 0)
				},
				async memGen4rag(u) {
					let o = this.memNew;
					if (o.working) return;
					if (o.parts.memCountT.total == 0) {
						alert("You have to add at least one topic for memory generation");
						return;
					}
					this.working = o.working = 1;
					let data = this.nicks[u].system;
					if (this.memNew.parts.wMemories && this.rag[u].t != null && this.rag[u].t.length) {
						data = `Description of ${this.nicks[u].n}: """${data}"""\n\nIt also should be consistent with these existing memories of ${this.nicks[u].n}: """${this.rag[u].t}"""`;
					}
					this.w({ data: data });
					await this.memGen(o, o.parts.system[0], data);

					this.cancel = o.cancel = this.working = o.working = 0;
				},
				async memGen(o, sys, udata) {
					let ms = [];
					let rgparams = new RegExp('\{PARAMS\}', 'si');
					const rgtopic = new RegExp(`\{TOPIC\}`, 'gsi');
					o.parts.m2do = [];
					let aid = this.userS('a');
					this.memGenParsedReset(o, 1);

					this.chatFinalPush(ms, {
						nId: -1,
						nick: this.nicks[-1].n,
						content: sys.req[0].req.replace(rgparams, udata),
						rating: '',
						images: [],
					});
					this.chatFinalPush(ms, {
						nId: aid,
						nick: this.nicks[aid].n,
						content: sys.req[1].req,
						rating: '',
						images: [],
					});

					this.w({ ms: ms });

					for (const m of o.parts.memCount) {
						for (const mc of this.memLnkDeref(o.parts, m.l)) {
							if (mc[m.qv] == null || mc[m.qv] == '' || mc[m.qp] == null || mc[m.qp] == '') continue;
							o.parts.m2do.push(this.charNewMemTopicTmpl(mc[m.qp], mc[m.qv]));
						}
					}
					this.w({ memories2do: o.parts.m2do });
					for (const mc of o.parts.m2do) {
						if (o.cancel == 1) break;
						if (mc.v == '' || mc.v == null) continue;
						if (!/^\d{1,4}$/.test(mc.q)) mc.q = 3;
						await this.memGenDo(ms, o.parts.tmp, mc.q, 3, sys.req[2].req.replace(rgtopic, mc.v), o, sys.sys);
					}
					this.w({ memories: this.charNew.parts.m });
				},
				async memGenDo(ms, m, q, by, req, obj, sys) {
					let i = 0, remains = 0, startpos = obj.parts.m.length, done = 0, lastpos = obj.parts.m.length;
					const rgAm = new RegExp('\{AMOUNT\}', 'si');
					while (i++ < 10) { //>
						if (obj.cancel == 1) break;

						done = obj.parts.m.length - startpos;
						remains = q - done;
						this.w(`starting cycle: required: ${q}, done: ${done}, remains: ${remains}, lastpos: ${lastpos}`); //>
						if (remains <= 0) break; //>

						this.chatFinalPush(ms, {
							nId: -1,
							nick: this.nicks[-1].n,
							content: req.replace(rgAm, remains > by ? by : remains),
							rating: '',
							images: [],
						});

						await this.chatSend({
							msg: m,
							finalTurn: ms.length - 1,
							final: ms,
							extra: [false],
							sys: sys,
							rooms: false,
							raw: false,
							func: this.memParse,
							d: obj,
							nicks: this.chatMsNicks({ aId: -1, uId: -1 }),
						});

						if (lastpos != obj.parts.m.length) {
							const tmp = obj.parts.m.slice(lastpos).map(mem => `<memory>${mem}</memory>`).join('\n');
							this.chatFinalPush(ms, {
								nId: this.userS('a'),
								nick: this.nicks[this.userS('a')].n,
								content: tmp,
								rating: '',
								images: [],
							});
							lastpos = obj.parts.m.length;
						} else {
							ms.pop();
						}
					}
				},
				memNewTmpl(o) {
					let m = {
						u: null,
						system: [],
						...this.memTmpl([])
					}
					for (const s in o.sys) {
						this.copy(o.sys, m.system, s);
					}
					this.memCount(m);
					this.w({ 'adding new mem tmpl': m })
					return m;
				},
				memTmpl(topics) {
					//don't use this. for data here
					let m = {
						m: [],
						k: [],
						mem: {
							custom: [],
						},
						memCount: [],
						memCountT: { total: 0 },
						mem2do: [],
						wMemories: false,
					};
					for (const ml in m.mem) {
						m.memCount.push({ l: 'mem.custom', t: 'Custom topic memories', tref: 'mems', q: 0, qp: 'q', qv: 'v' });
					}
					for (const t of topics) {
						m.mem.custom.push(this.charNewMemTopicTmpl(t.q, t.t));
					}
					m.mem.custom.push(this.charNewMemTopicTmpl(1, ''));
					return m;
				},
				charNewMemTopicTmpl(q, v) {
					return { q: q, v: v, c: '' };
				},
				memLnkDeref(o, l) {
					let ml = o;
					//this.w({deref:o,l:l});
					for (const i of l.split('.')) {
						if (!/^[a-zA-Z0-9]{1,32}$/.test(i)) continue;
						ml = ml[i];
					}
					return ml;
				},
				memCount(o) {
					let used = { total: 0 };
					for (let m of o.memCount) {
						used[m.tref] = 0;
						for (const mi of this.memLnkDeref(o, m.l)) {
							//this.w({'check val of mem':mi,qv:m.qv,qp:m.qp});
							if (mi[m.qv] == null || mi[m.qv] == '' || mi[m.qp] == null || mi[m.qp] == '') continue;
							//this.w({'recalculating mem':mi[m.qp]});
							used[m.tref] += mi[m.qp] * 1;
						}
						m.q = used[m.tref];
						used.total += used[m.tref];
						//this.w({'memories':m,name:m.t});
					}
					o.memCountT = used;
					//this.w({'memories':o.memCount,total:o.memCountT});
				},
				memParse(c, o) {
					let rgmem = new RegExp(`<memory>(.+?)</memory>`, 'gsi');
					let tmp;
					while (tmp = rgmem.exec(c)) {
						//this.w({parsing:tmp});
						if (tmp == null || !tmp[1].trim().length) continue;
						tmp[1] = tmp[1].trim();
						if (tmp[1] == 'generated memory') continue;
						let exists = 0;
						for (const m of o.parts.m) {
							if (m === tmp[1]) {
								exists = 1;
								break;
							}
						}
						if (!exists) {
							o.parts.m.push(tmp[1]);
							this.w(`found: ${tmp[1]}`);
						}
					}
				},
				charNewParse(c) {
					let rg = {};
					for (let p of this.charNew.parts.params) {
						//this.w(`extracting: ${p.n}`);
						rg[p] = new RegExp(`<${p.n}>([^<]+?)</${p.n}>`, 'si');
						const res = rg[p].exec(c);
						if (res && res.length > 0) {
							if (p.c.length) continue;
							p.c = res[1].trim();
							//this.w(`found ${p.n}: ${p.c}`);
						}
					}
					//this.w({parts:this.charNew.parts.params});
				},
				quit() {
					if (confirm("Are you sure you wish to quit the game?")) {
						window.close();
						alert("You wish.");
					}
				},
				groupCh(id) {
					this.w(`changing group to ${id} ${this.groups[id]}`);
					this.group = id * 1;
					//this.turnLastFilteredGo();
				},
				w(a) {
					if (!this.log) return;
					this.wDo(a);
				},
				wDo(a) {
					//console.log(a);
					if (typeof a === 'object') {
						let tmp = JSON.stringify(a, null, 2);
						console.log(tmp ?? a);
					} else if (Array.isArray(a)) {
						let tmp = JSON.stringify(a, null, 2);
						console.log(tmp ?? a);
					} else {
						console.log(a);
					}
				},
				click(id) {
					const c = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
					document.getElementById(id).dispatchEvent(c);
				},
				tokensTotal(m, model) {
					if (!this.config.tokensCount.v) return;

					return this.tokens(m, model, 'tp') + this.tokens(m, model, 'tr');
				},
				tokens(m, model, id) {
					//this.w(`connection=${this.connection} this.model=${JSON.stringify(this.settings.req.model.v.v)} models=${JSON.stringify(this.models,null,2)}`)
					if (model == null) model = this.models[this.settings.req.model.v.v].n;
					return m[id][model];
				},
				pToggleDo(id, v) {
					if (v == undefined) v = !this.pState[id];
					this.w(`toggling ${id} to ${v}`);
					this.pState[id] = v;
				},
				async pToggle(id, v) {
					this.pToggleDo(id, v);
					await nextTick();
					let to = 0;
					if (id == 'howto' || id == 'sets') to = 1;
					if (id == 'sys' || id == 'instr') id = 'sysinstr';
					this.scroll(id, 1);
				},
				optToggle() {
					if (this.pState['opt']) {
						this.pToggle('opt');
						return;
					}
					this.opt.count = { t: 0, d: 0 };
					this.opt.res = {};
					for (const m in this.settings.req.model.v.l) {
						this.w(`creating tune params for model ${m}`);
						if (!this.opt['v'].hasOwnProperty('m')) this.opt[m] = { v: {}, k: '', times: 1 };
						for (const j of [this.config, this.settings.options, this.settings.req]) {
							for (const key in j) {
								this.w(`filling in opt ${key}`);
								const i = j[key];
								if (!i.opt) continue;
								if (this.opt[m]['v'].hasOwnProperty(key)) continue;
								this.opt[m]['v'][key] = { start: '', end: '', step: '', v: '', use: false, rnd: '' };
							}
						}
						//this.opt.res[m]={v:[],k:[],count:0};
					}
					this.pToggle('opt');
				},
				msgFilter(turn, b, m) {
					return this.msgFilterDo(this.turns[turn].branches[b].msgs[m]);
				},
				msgFilterDo(msg) {
					if (!this.config.stories.v) {
						return 0;
					} else if (!this.context[0] && !this.context[1] && !this.context[2]) {
						return 1;
					} else if (!this.context[0]) {
						const u = this.userS("u"), a = this.userS("a");
						if (this.context[3] && this.context[1] && this.context[2]) {
							if (!msg.nicks[u] && !msg.nicks[a]) return 1;
							if (!(msg.nicks[a] && this.context[1]) || !(msg.nicks[u] && this.context[2])) return 1;
						} else {
							if (!msg.nicks[u] && !msg.nicks[a]) return 1;
							if (!(msg.nicks[a] && this.context[1]) && !(msg.nicks[u] && this.context[2])) return 1;
						}
					}
					return 0;
				},
				msgSkipped(turn, b, m) {
					if (this.hideMsg(turn, b, m)) return 1;
					if (this.msgFilter(turn, b, m)) return 1;
					return 0;
				},
				hideMsg(turn, b, m) {
					if (turn == 0) return 1;
					const t = this.turns[turn];
					const msg = t.branches[b].msgs[m];

					if (this.msgRole(msg) !== "u") return 0;
					if (!this.config.hideEmptyOwn.v) return 0;
					if (this.config.showEmptyOwnSide.v && this.msgTotal(turn, b) > 1) return 0; //force showing.
					if (this.msgSide(msg)) return 0;
					if (!this.msgEmpty(turn, b, m)) return 0;
					return 1;
				},
				listmsgs(m, turn, msg) {
					const role = this.msgRole(msg);
					this.w(`listing ${m} - turn ${turn}, m: ${m}, ctrl: ${this.ctrl} role: ${role}`);
					if (this.opt.run) return 0;
					if (this.userS('u') == null || this.userS('a') == null) return 0;
					if (m == 1 && this.ctrl && role === 'a') m = 2;
					if (m == 2 && role === 'u') m = 1; //for right mouse click

					if (m == 0) { this.msgMvLeft(turn) }
					else if (m == 1) { this.msgMvRight(turn, 0, true) }
					else if (m == 2) { this.msgMvRight(turn, 1, true) }
				},
				optChUse(m, k) {
					const p = ['start', 'end', 'step'];
					let found = 0;
					const o = this.opt[m].v[k];
					for (let P of p) {
						if (o[P].length) found++;
					}
					o.use = (found == p.length ? true : false);
				},
				optimizeCancel() {
					if (this.working) this.cancel = true;
					this.opt.cancel = true;
				},
				async optimizeRun() {
					if (this.turn < 2) { //>
						alert('You need to have a chat log, before you may start this. It creates side-replies, so it needs to have some content for AI to create alternative versions of replies to it.');
						return;
					}
					if (this.msgRole(this.msga(this.turn)) === 'u') {
						alert('You need to stop at the AI reply in your chat log, right now last message in the chat log belongs to you.');
						return;
					}
					const b = this.branchac; if (b.msg != b.msgs.length - 1) b.msg = b.msgs.length - 1;
					this.opt.run = true;
					let menus = [0, 0];
					if (this.pState['control']) { this.pToggleDo('control'); menu[2] = 1 };
					if (this.pState['menu']) { this.pToggleDo('menu'); menu[0] = 1 };
					if (this.config.setsQ.v) { this.config.setsQ.v = false; menu[1] = 1 };

					let opts = { bak: {}, v: {} };
					let ht = { config: this.config, options: this.settings.options, req: this.settings.req }
					for (let m in this.settings.req.model.v.l) {
						this.w(`collecting combinations for model ${m} ${this.settings.req.model.v.l[m].tag}`)
						opts.v[m] = [];
						//let found=0;
						for (const i in ht) {
							for (const key in ht[i]) {
								if (!ht[i][key].opt) continue;
								if (!this.opt[m].v[key].use) continue;
								if (ht[i][key].f == 'cb') {
									this.opt[m].v[key].start = 0;
									this.opt[m].v[key].end = 1;
									this.opt[m].v[key].step = 1;
									this.opt[m].v[key].rnd = '';
								} else {
									if (!/^\d{1,14}$/.test(this.opt[m].times)) {
										this.opt.run = false;
										alert(`Amount of replies per combination should be a sane value.`);
										scroll('optTimes');
										return;
									}
									if (!/^\d{0,16}$/.test(this.opt[m].v[key].rnd)) {
										this.opt.run = false;
										alert(`Field's ${ht[i][key].name} "Round up to N decimals" value ${this.opt[m].v[key].rnd} for model ${this.settings.req.model.v.l[m].n} is not a positive integer, please correct it.`);
										return;
									}
									for (const p of ['start', 'end', 'step']) {
										const val = this.opt[m].v[key][p];
										this.w(`checking params of ${key} ${p}=${val}`);
										if (!/^\d+(\.\d+)?$/.test(val)) {
											this.opt.run = false;
											alert(`Field's ${ht[i][key].name} ${p} value ${val} for model ${this.settings.req.model.v.l[m].n} is not numeric, please correct it.`);
											return;
										}
									}
									if (this.opt[m].v[key].step == 0) {
										this.opt.run = false;
										alert(`Field's ${ht[i][key].name} step is set to zero, that would mean endless loop.`);
										return;
									}
								}
								opts['v'][m].push({
									key: key,
									lnk: ht[i][key],
									times: this.opt[m].times,
									...this.opt[m].v[key]
								});
								if (!opts.bak.hasOwnProperty(i)) opts.bak[i] = {};
								if (!opts.bak[i].hasOwnProperty(key)) opts.bak[i][key] = { lnk: ht[i][key], v: ht[i][key]['v'] };
								this.w(`stored bak value: ${opts.bak[i][key]} for ${i} ${key}`);
							}
						}
						if (!opts.v[m].length) delete opts.v[m];
					}
					const t = this;
					let res = [];
					let ci = opts.length;
					async function optDo(p, i, opt, res, vals, idle) {
						t.w({ index: i, p: p });
						const P = p[i];
						t.w({ from: P.start, to: P.end, step: P.step });
						let v;
						for (let V = P.start * 1; V <= P.end * 1; V += P.step * 1) { //>
							if (P.rnd !== '') {
								v = t.rnd(V, P.rnd);
							} else {
								v = V;
							}
							t.w(`going with value ${p[i].key} ${v}`);
							P.lnk.v = v;
							vals[i] = v;
							if ((p.length - 1) > i) {  //>
								t.w(`this is (${i}) not the last level, going deeper`);
								await optDo(p, i * 1 + 1, opt, res, vals, idle);
								continue;
							}
							if (t.opt.cancel) {
								t.w('cancelling opt');
								return;
							}
							opt.vals = vals;

							for (let tms = 1; tms <= P.times; tms++) { //>
								opt.count.d++;
								if (idle) continue;

								t.w(`trying new iteration`);
								const coord = await t.msgMvRight(t.turn, 0, true);
								t.w({ coords: coord });
								let msg = t.turns[coord[0]].branches[coord[1]].msgs[coord[2]];
								const ct = t.msgContent(msg, t.config.trinity.v, -1);
								let found = 0;
								for (let j = 0; j < res.length; j++) { //>
									if (res[j]['c'] !== ct) continue;
									res[j].ids.push(coord[2]);
									res[j].v.push([...vals]);
									found = 1;
								}
								if (!found) res.push({ c: ct, ids: [coord[2]], v: [[...vals]] });
							}
						}
					}
					this.w({ valuesToTry: opts });

					this.opt.res = {};
					for (const m in opts.v) {
						this.opt.res[m] = { v: [], k: [], count: 0 };
						for (const i of opts.v[m]) { this.opt.res[m].k.push(i.lnk) }
					}

					function optsRestore(opts) {
						for (const i in opts.bak) {
							for (const k in opts.bak[i]) {
								t.w(`restoring in ${i} bak value of ${k} to ${opts.bak[i][k].v}`);
								opts.bak[i][k].lnk.v = opts.bak[i][k].v;
							}
						}
					}

					this.opt.vals = [];
					this.opt.count = { t: 0, d: 0 };
					const modelbak = this.settings.req.model.v.v;

					for (const m in opts.v) {
						await optDo(opts.v[m], 0, this.opt, this.opt.res[m].v, [], true);
					} this.opt.count.t += this.opt.count.d; this.opt.count.d = 0;

					for (const m in opts.v) {
						this.settings.req.model.v.v = this.opt.m = m;
						optsRestore(opts);
						await optDo(opts.v[m], 0, this.opt, this.opt.res[m].v, [], false);
					} optsRestore(opts);

					this.w({ opt: this.opt });
					this.settings.req.model.v.v = modelbak;
					this.opt.cancel = false;
					this.opt.run = false;

					if (menu[0]) this.pToggleDo('menu');
					if (menu[1]) this.config.setsQ.v = true;
					if (menu[2]) this.pToggleDo('control');
					await nextTick();
					this.scroll('optRes', true);
				},
				rnd(n, d) {
					return Number(Math.round(n + 'e' + d) + 'e-' + d);
				},
				rand(min, max) {
					return Math.floor(Math.random() * (max - min + 1)) + min;
				},

				//db methods
				prune() {
					if (
						confirm("Are you sure you wish to permanently erase everything but the currently selected branch of messages? Again, this will erase all the alternative chat records. Proceed?")
						&&
						confirm("Are you really sure?")
					) {
						for (const i in this.turns) {
							if (i == 0) continue;
							this.w({ 'pruning': i, 'turn': this.turns[i] });
							if (this.turns[i].branch === -1) {
								this.w(`erasing turns up to ${i}`);
								this.turns = this.turns.slice(0, i);
								break;
							}
							let tmp = this.brancha(i);
							this.turnBranchSet(i, 0);
							this.turns[i].branches = [];
							this.turns[i].branches.push(tmp);
							tmp = this.msga(i);
							this.turns[i].branches[0].msg = 0;
							this.turns[i].branches[0].msgs = [tmp];
							this.turns[i].tree = {};
							this.treeu(i);
							this.w(this.turns[i].branches);
						}
					}
				},
				clear() {
					if (
						confirm("Are you sure you wish to permanently erase all the chat log? Proceed?")
						&&
						confirm("Are you really sure you want to erase all the chat log?")
					) {
						this.turn = 0;
						this.turns.splice(1);
					}
				},
				async load() {
					this.w('drop all changes since load');
					if (!confirm('Please do not trust files of other people, as they can inject something. The most obvious and easiest thing is to set your ollama url to something they control, so they can see your chat then. Another potential attack vector is some specially crafted prompt to exploit ollama, that can be in some of the fields sent to Ollama. In other words, load only your own chats. Load this file?')) return;
					this.connection = 0; //to prevent partial updates to dom
					for (const i in this.def) {
						this.w(`restoring ${i}`)
						if (i == 'def') continue;
						this.copy(this.def, this.$data, i)
					}

					const l = document.getElementById('load');
					let fr = new FileReader();
					let t = this;
					let d;
					//as i do not copy structures per version, this upgrade is whacky :)
					//it may break if in future some structures get changed without updating this.
					//but so far it works and i don't want to make file bigger just with 
					//copying all these default tables per version.
					//if needed, then it has to be changed.

					async function parse(d) {
						if (!d) {
							t.w('parsing loaded file');
							d = JSON.parse(fr.result);
							delete d.def;
							delete d.inited;
							d.connection = 0; //to prevent partial updates to dom
						} else {
							t.w(`recursive updating`);
						}
						t.w(d)
						//if(d.hasOwnProperty('nicks')) t.w({nicksd:d.nicks});
						//patch for 1.8 shift.
						if (t.$data.hasOwnProperty('configGlobal')) {
							t.config = t.configGlobal;
							t.settings = t.settingsGlobal;
							if (t.settingsGlobal.req.hasOwnProperty('model')) {
								t.model = t.settingsGlobal.req.model.v.v;
							}
						}
						let ver;
						if (d.hasOwnProperty('configGlobal')) {
							ver = d.configGlobal.version.v;
						} else if (d.hasOwnProperty('config')) {
							ver = d.config.version.v;
							t.def.config = computed(() => t.def.configGlobal);
							t.def.settings = computed(() => t.def.settingsGlobal);
						} else {
							ver = 0;
							t.def.config = computed(() => t.def.configGlobal);
							t.def.settings = computed(() => t.def.settingsGlobal);
						}
						t.w(`new parser pass for ver: ${ver}`);

						if (ver == 0) { //updating from version 0->1
							t.w('upgrading from version 0');

							t.copy(t.def, d, 'configGlobal'); d.config = d.configGlobal; delete d.configGlobal;
							t.copy(t.def, d, 'settingsGlobal'); d.settings = d.settingsGlobal; delete d.settingsGlobal;

							d.nicks = {
								0: { 't': 'u', 'n': d.nick, 'id': 0 },
								1: { 't': 'a', 'n': d.nickai, 'id': 1 }
							};
							delete d.nick;
							delete d.nickai;
							t.updateAddParams(d, 'nick');
							t.w({ config: d.config })
							d.config.url.v = d.url;
							delete d.url;

							let tmp;
							tmp = d.system; delete d.system; d.system = { '1': tmp };
							tmp = d.instr; delete d.instr; d.instr = { '1': tmp };

							t.updateAddParams(d, 'amountNicks');
							t.updateAddParams(d, 'pState');

							for (const i in d.pState) {
								d.pState[i] = 0;
							}
							delete d.sysHide;
							delete d.instrHide;
							delete d.pullHide;
							delete d.setingsHide;
							delete d.settings; //just delete old settings )
							t.copy(t.def, d, 'settingsGlobal'); d.settings = d.settingsGlobal; delete d.settingsGlobal;
							d.config.version.v = 1;
							t.w(`upgraded to version ${d.config.version.v}`);
							parse(d);
							return;
						} else if (ver == 1) {
							t.w(`upgrading from version ${d.config.version.v}`);
							d.config.version.v = 1.1;
							//delete d.settings; //just delete old settings )
							t.copy(t.def, d, 'settingsGlobal'); d.settings = d.settingsGlobal; delete d.settingsGlobal;
							d.config.version.v = 1.1;
							t.w(`upgraded to version ${d.config.version.v}`);
							parse(d);
							return;
						} else if (ver == 1.1) {
							t.w(`upgrading from version ${d.config.version.v}`);
							d.config.version.v = 1.2;
							t.updateAddParams(d, 'config');
							for (const i in d.models) {
								if (d.models[i].n != d.model) continue;
								d.model = i;
								break;
							}
							for (const t of d.turns) {
								for (const b of t.branches) {
									for (const m of b.msgs) {
										m.tp = {};
										m.tr = {};
									}
								}
							}
							let tmp = {};
							t.w({ 'updating nicks': d.nicks });
							d.nicks['-1'] = t.nicks['-1'];
							d.amountNicks['s'] = t.amountNicks['s'];
							d.nick['s'] = t.nick.s;
							d.nick['n']['s'] = t.nick.n.s;
							t.w({ 'updated nicks': d.nicks, nick: d.nick, amountNicks: d.amountNicks })
							d.config.version.v = 1.2;
							t.w(`upgraded to version ${d.config.version.v}`);
							parse(d);
							return;
						} else if (ver == 1.2) {
							t.w(`upgrading from version ${d.config.version.v}`);
							d.config.version.v = 1.3;
							t.updateAddParams(d, 'config');
							d.config.version.v = 1.3;
							t.w(`upgraded to version ${d.config.version.v}`);
							parse(d);
							return;
						} else if (ver == 1.3) {
							t.w(`upgrading from version ${d.config.version.v}`);
							d.config.version.v = 1.4;
							let tmp = t.msgTmpl(1, null, 0); //just to get new fields
							for (let tu = 1; tu < d.turns.length; tu++) { //>
								tu = d.turns[tu];
								//if(tu.role==='root') continue;
								for (const b of tu.branches) {
									if (!b.msgs.length) continue;
									for (const m of b.msgs) {
										for (const i in tmp) {
											if (m.hasOwnProperty(i)) continue;
											m[i] = tmp.i
										}
										m.status = t.msgStatusId('done');
									}
								}
							}
							t.updateAddParams(d, 'config');
							d.config.version.v = 1.4;
							t.w(`upgraded to version ${d.config.version.v}`);
							parse(d);
							return;
						} else if (ver == 1.4) {
							t.w(`upgrading from version ${d.config.version.v}`);
							d.config.version.v = 1.5;
							if (Array.isArray(d.settings.options.stop.v)) {
								t.settingsGlobal.options.stop.v = d.settings.options.stop.v;
							} else {
								t.settingsGlobal.options.stop.v = [d.settings.options.stop.v];
							}
							d.settings.options = t.settingsGlobal.options;
							t.w({ testtt: d.settings.options });
							//if we change userAdd or structures this will need rewriting
							//clean current list
							for (const i in t.nicks) {
								if (i.id > 1) delete t.nicks[i.id];
							}
							t.amountNicks['idNext'] = 2;
							//find max id in loaded.
							let maxId = 1;
							for (const i in d.nicks) {
								d.nicks[i].del = 0; //add del key
								if (i > maxId) maxId = i;
							}
							t.amountNicks['idNext'] = maxId * 1 + 1;
							let tmp = t.msgTmpl(1, null, 0); //just to get new fields
							for (const tu of d.turns) {
								if (tu.role === 'root') continue;
								for (const b of tu.branches) {
									if (!b.msgs.length) continue;
									for (const m of b.msgs) {
										let role;
										if (tu.role === 'user') role = 'u'
										if (tu.role === 'assistant') role = 'a';
										if (tu.role === 'system') role = 's';
										//set status done for all without of one
										if (!m.hasOwnProperty('status')) m.status = t.msgStatusId('done');
										if (m.status == null) m.status = t.msgStatusId('done');
										m.edited = 0; //add edited key
										m.nId = null;
										//match name to ids
										for (const i in d.nicks) {
											if (m.nick === d.nicks[i].n) {
												m.nId = i;
												break;
											}
										}
										//if not found (deleted) add a deleted user
										if (m.nId == null) {
											//copy added deleted user to d
											t.nick['n'][role] = m.nick;
											await t.userAdd(role, m.nick, {});
											let id = t.amountNicks['idNext'] - 1;
											t.nicks[id].del = 1;
											d.nicks[id] = t.nicks[id];
											m.nId = id;
										}
									}
								}
							}
							t.updateAddParams(d, 'config');
							d.config.version.v = 1.5;
							t.w(`upgraded to version ${d.config.version.v}`);
							parse(d);
							return;
						} else if (ver == 1.5) {
							t.w(`upgrading from version ${d.config.version.v}`);
							d.config.version.v = 1.6;
							t.updateAddParams(d, 'config');
							for (const i in d.config) {
								if (!t.config.hasOwnProperty(i)) continue;
								for (const j of ['q', 'qn']) { d.config[i][j] = t.config[i][j] }
							}
							for (const i in d.settings.options) {
								for (const j of ['q', 'qn']) { d.settings.options[i][j] = t.settings.options[i][j] }
							}
							for (const i in d.settings.req) {
								for (const j of ['q', 'qn']) { d.settings.req[i][j] = t.settings.req[i][j] }
							}
							t.w(`upgraded to version ${d.config.version.v}`);
							parse(d);
							return;
						} else if (ver == 1.6) {
							t.w(`upgrading from version ${d.config.version.v}`);
							d.config.version.v = 1.7;
							t.w({ n: d.nick });
							t.updateAddParams(d, 'config');
							t.updateAddParams(d, 'group');
							t.updateAddParams(d, 'groupAddN');
							t.updateAddParams(d, 'context');
							t.updateAddParams(d, 'msgUserListOn');
							d.pState = t.pState;
							t.group = 0;
							for (const u in t.nicks) {
								if (t.nicks[u].t == 's') continue;
								t.userDelDo(u);
								delete t.nicks[u];
							}
							t.w({ 'list of users before import': t.nicks, importing: d.nicks, sys: d.system });

							let tmp = { system: {}, instr: {}, ids: {} };
							for (const u in d.nicks) {
								if (d.nicks[u].t == 's') continue;
								if (d.nicks[u].del) continue;
								const id = await t.userAdd(d.nicks[u].t, d.nicks[u].n, {});
								tmp.ids[u] = id;
								tmp.system[id] = d.system[u];
								tmp.instr[id] = d.instr[u];
								t.userGroupAdd(1, id);
							}
							d.system = tmp.system;
							d.instr = tmp.instr;
							d.groups = t.groups;
							d.nicks = t.nicks;
							d.group = 1;
							d.amountNicks = t.amountNicks;

							for (const tu of d.turns) {
								for (const b of tu.branches) {
									if (!b.msgs.length) continue;
									for (const m of b.msgs) {
										m.nId = tmp.ids[m.nId];
										m.nicks = {};
										for (const u in d.nicks) {
											if (d.nicks[u].t != 'u' && d.nicks[u].t != 'a') continue;
											m.nicks[u] = true;
										}
										m.nicksArr = t.msgUserListAll({ nicks: m.nicks });
									}
								}
							}
							t.w(`upgraded to version ${d.config.version.v}`);
							parse(d);
							return;
						} else if (ver == 1.7) {
							t.w(`upgrading from version ${d.config.version.v}`);
							d.config.version.v = 1.8;
							for (const u in d.nicks) {
								d.nicks[u].system = d.system[u];
								d.nicks[u].instr = d.instr[u];
								d.nicks[u].setsDo = false;
								d.nicks[u].sets = false;
							}
							delete d.system;
							delete d.instr;
							delete t.system;
							delete t.instr;

							t.w(`upgraded to version ${d.config.version.v}`);
							parse(d);
							return;
						} else if (ver == 1.8) {
							t.w(`upgrading from version ${d.config.version.v}`);
							d.settings.req.model = {};
							t.copy(t.settingsGlobal.req, d.settings.req, 'model');
							d.settings.req.model.v.v = d.model;
							d.configGlobal = d.config;
							d.settingsGlobal = d.settings;
							delete d.config;
							delete d.settings;
							delete d.model;
							delete d.message;
							for (let m of d.models) {
								m.n = `${m.n} (${m.ps} ${m.q})`;
							}

							d.configGlobal.version.v = 1.9;
							t.w(`upgraded to version ${d.configGlobal.version.v}`);
							parse(d);
							return;
						} else if (ver == 1.9) {
							t.w(`upgrading from version ${d.configGlobal.version.v}`);
							d.configGlobal.version.v = '1.9.2';

							for (const p in t.configGlobal) {
								t.w(`updating key ${p} in config`);
								if (!d.configGlobal.hasOwnProperty(p)) continue;
								d.configGlobal[p].opt = t.def.configGlobal[p].opt;
								d.configGlobal[p].def = t.def.configGlobal[p].def;
								for (let u in d.nicks) {
									u = d.nicks[u];
									if (!u.hasOwnProperty('config')) continue;
									u.config[p].def = t.def.configGlobal[p].def;
									u.config[p].opt = t.def.configGlobal[p].opt;
								}
							}
							for (const s of ['options', 'req']) {
								for (const p in t.def.settingsGlobal[s]) {
									t.w(`processing param ${p}`);
									if (!d.settingsGlobal[s].hasOwnProperty(p)) continue;
									if (!d.settingsGlobal[s][p].hasOwnProperty('name')) d.settingsGlobal[s][p].name = p;

									d.settingsGlobal[s][p].opt = t.def.settingsGlobal[s][p].opt;
									d.settingsGlobal[s][p].def = t.def.settingsGlobal[s][p].def;
									for (let u in d.nicks) {
										u = d.nicks[u];
										if (!u.hasOwnProperty('settings')) continue;
										u.settings[s][p].def = t.def.settingsGlobal[s][p].def;
										u.settings[s][p].opt = t.def.settingsGlobal[s][p].opt;
										if (!u.settings[s][p].hasOwnProperty('name')) u.settings[s][p].name = p;
									}
								}
							}
							t.updateAddParams(d, 'pState');
							t.updateAddParams(d, 'opt');
							t.w(`upgraded to version ${d.configGlobal.version.v}`);
							parse(d);
							return;
						} else if (ver == "1.9.2") {
							t.w(`upgrading from version ${d.configGlobal.version.v}`);
							d.configGlobal.version.v = '1.9.3';
							for (const m in d.opt) {
								for (const p in d.opt[m].v) {
									d.opt[m].v[p].rnd = '';
								}
							}
							t.w(`upgraded to version ${d.configGlobal.version.v}`);
							parse(d);
							return;
						} else if (ver == "1.9.3") {
							d.configGlobal.version.v = '1.9.4';
							parse(d);
							return;
						} else if (ver == "1.9.4") {
							t.w(`upgrading from version ${d.configGlobal.version.v}`);
							d.configGlobal.version.v = '1.9.5';

							t.updateAddParams(d, 'configGlobal');
							t.updateAddParams(d, 'pState');
							d.modelsEmb = [{
								tag: 'nomic-embed-text:latest',
								n: 'nomic-embed-text:latest (hardcoded)',
								mt: null,
								s: null,
								ps: null,
								q: null,
								ctx: null,
								emb: true
							}]; // Hardcoded embedding model
							t.copy(t.def.settingsGlobal.req, d.settingsGlobal.req, 'modelEmb');
							d.rag = {};
							for (let u in d.nicks) {
								d.rag[u] = t.ragStrct();
								u = d.nicks[u];
								if (!u.hasOwnProperty('settings')) continue;
								t.copy(t.def.settingsGlobal.req, u.settings.req, 'modelEmb');
								t.copy(t.def.configGlobal, u.config, 'urlEmb');
								delete u.config.urlProxy;
							}
							delete d.configGlobal.urlProxy;
							delete d.proxy;

							t.w(`upgraded to version ${d.configGlobal.version.v}`);
							parse(d);
							return;
						} else if (ver == "1.9.5") {
							t.w(`upgrading from version ${d.configGlobal.version.v}`);
							d.configGlobal.version.v = '1.9.6';

							d.rag['g'] = t.ragStrct();
							t.updateAddParams(d, 'configGlobal');
							d.configGlobal.stories.d = t.def.configGlobal.stories.d;
							if (d.configGlobal.stories.v) {
								d.configGlobal.storiesUI.v = true;
							} else {
								d.configGlobal.stories.v = true;
								d.configGlobal.storiesUI.v = false;
							}

							for (let u in d.nicks) {
								if (!d.rag.hasOwnProperty(u)) d.rag[u] = t.ragStrct();
								u = d.nicks[u];
								if (!u.hasOwnProperty('settings')) continue;
								t.copy(t.def.configGlobal, u.config, 'ragMinSmlr');
								t.copy(t.def.configGlobal, u.config, 'storiesUI');
								t.copy(t.def.configGlobal, u.config, 'bgImg');
								t.copy(t.def.configGlobal, u.config, 'bgFixed');
								t.copy(t.def.configGlobal, u.config, 'chatHeight');
								t.copy(t.def.configGlobal, u.config, 'imgsLastOnly');
								t.copy(t.def.configGlobal, u.config, 'rag');
								t.copy(t.def.configGlobal, u.config, 'ragGAmount');
								t.copy(t.def.configGlobal, u.config, 'ragUAmount');

								u.config.stories.d = t.def.configGlobal.stories.d;
								if (u.config.stories.v) {
									u.config.storiesUI.v = true;
								} else {
									u.config.stories.v = true;
									u.config.storiesUI.v = false;
								}
							}

							t.w(`upgraded to version ${d.configGlobal.version.v}`);
							parse(d);
							return;
						} else if (ver == "1.9.6") {
							t.w(`upgrading from version ${d.configGlobal.version.v}`);
							d.configGlobal.version.v = '1.9.7';

							t.updateAddParams(d, 'configGlobal');
							for (const p in t.def.configGlobal) {
								d.configGlobal[p].g = t.def.configGlobal[p].g;
							}
							for (const s of ['options', 'req']) {
								for (const p in t.def.settingsGlobal[s]) {
									d.settingsGlobal[s][p].g = t.def.settingsGlobal[s][p].g;
								}
							}

							for (let u in d.nicks) {
								u = d.nicks[u];
								if (!u.hasOwnProperty('settings')) continue;
								t.copy(t.def.configGlobal, u.config, 'ragPast');
								u.config.version.v = '1.9.7';

								for (const p in t.def.configGlobal) {
									if (!u.config.hasOwnProperty(p)) {
										t.copy(t.def.configGlobal, u.config, p);
									} else {
										u.config[p].g = t.def.configGlobal[p].g;
									}
								}
								for (const s of ['options', 'req']) {
									for (const p in t.def.settingsGlobal[s]) {
										if (!t.def.settingsGlobal[s].hasOwnProperty(p)) {
											t.copy(t.def.settingsGlobal[s], u.settings[s], p);
										} else {
											u.settings[s][p].g = t.def.settingsGlobal[s][p].g;
										}
									}
								}
							}

							t.w(`upgraded to version ${d.configGlobal.version.v}`);
							parse(d);
							return;
						} else if (ver == "1.9.7") {
							t.w(`upgrading from version ${d.configGlobal.version.v}`);
							d.configGlobal.version.v = '1.9.8';

							t.updateAddParams(d, 'pState');
							t.copy(t.def, d, 'memNew');
							t.copy(t.def, d, 'charNew');

							d.charNew.parts = t.charNewTmpl(d.charNew);
							d.memNew.parts = t.memNewTmpl(d.memNew);

							t.charCreateReset(d.charNew);

							for (const tr of d.turns) {
								br: for (const b of tr.branches) {
									let rated = 0;
									for (const m of b.msgs) {
										if (m.rating != null && m.rating !== '') {
											rated = 1;
											break;
										}
									}
									b.rated = rated ? true : false;
								}
							}
							t.w(`upgraded to version ${d.configGlobal.version.v}`);
							parse(d);
							return;
						} else if (ver == "1.9.8") {
							t.w(`upgrading from version ${d.configGlobal.version.v}`);
							d.configGlobal.version.v = '1.9.8b';

							d.settingsGlobal.req.model.sess = 'v';
							d.settingsGlobal.req.modelEmb.sess = 'v';
							for (let u in d.nicks) {
								if (!u.hasOwnProperty('settings')) continue;
								u.settings.req.model.sess = 'v';
								u.settings.req.modelEmb.sess = 'v';
							}
							t.w(`upgraded to version ${d.configGlobal.version.v}`);
							parse(d);
							return;
						} else if (ver == "1.9.8b") {
							t.w(`upgrading from version ${d.configGlobal.version.v}`);
							d.configGlobal.version.v = '1.9.9';
							t.updateAddParams(d, 'configGlobal');
							d.turns[0].branches[0].msgs[0].nId = -1;

							for (let u in d.nicks) {
								u = d.nicks[u];
								if (!u.hasOwnProperty('settings')) continue;
								t.copy(t.def.configGlobal, u.config, 'raw');
								t.copy(t.def.configGlobal, u.config, 'trinity');
								t.copy(t.def.configGlobal, u.config, 'trinityReqTh');
								t.copy(t.def.configGlobal, u.config, 'trinityReqA');
								t.copy(t.def.configGlobal, u.config, 'rawTmpl');
								t.copy(t.def.configGlobal, u.config, 'rawLog');
								t.copy(t.def.configGlobal, u.config, 'aiIsYou');
								t.copy(t.def.configGlobal, u.config, 'noAiReplyToSelf');
								t.copy(t.def.configGlobal, u.config, 'noReplyToSelf');
								t.copy(t.def.configGlobal, u.config, 'namesAdd');
								t.copy(t.def.configGlobal, u.config, 'trinityChancesTh');
								t.copy(t.def.configGlobal, u.config, 'emptyToSth');
								t.copy(t.def.configGlobal, u.config, 'emptyToTxt');
							}

							for (let turn = 0; turn < d.turns.length; turn++) { //>
								if (turn == 0) continue;
								const tr = d.turns[turn];
								for (const b of tr.branches) {
									for (const m of b.msgs) {
										m.content3 = {};
										t.msgContentSet(m, 'a', m.content, false);
										if (turn != 0) {
											if (m.status == null && (!m.side || m.side == 0)) {
												m.status = t.msgStatusSetDo(m, 'done');
											} else {
												t.msgStatusSetDo(m, t.msgStatusId2W(m.status));
											}
											for (const bp in tr.tree) {
												if (bp >= d.turns[turn - 1].branches.length) {
													delete tr.tree[bp]
													continue;
												}
												for (const mp in tr.tree[bp]) {
													if (mp >= d.turns[turn - 1].branches[bp].msgs.length) {
														delete tr.tree[bp][mp];
													}
												}
											}
										}
									}
								}
							}
						} else if (ver == "1.9.9") {
							t.w(`upgrading from version ${d.configGlobal.version.v}`);
							d.configGlobal.version.v = '1.9.10';
							t.updateAddParams(d, 'configGlobal');
							for (let u in d.nicks) {
								u = d.nicks[u];
								if (!u.hasOwnProperty('settings')) continue;
								t.copy(t.def.configGlobal, u.config, 'trinityOwCOnOff');
							}
						}

						t.w('adding new config vars');
						t.updateAddParams(d, 'configGlobal');

						for (let i in d) {
							t[i] = d[i]
						}

						t.w('restore data links to computed vals');
						t.nicks[-1].n = computed(() => t.config.sysNick.v);
						t.settingsGlobal.req.model.v.l = computed(() => t.models);
						t.settingsGlobal.req.modelEmb.v.l = computed(() => t.modelsEmb);
						for (let u in t.nicks) {
							u = t.nicks[u];
							if (!u.hasOwnProperty('settings')) continue;
							u.settings.req.model.v.l = computed(() => t.models);
							u.settings.req.modelEmb.v.l = computed(() => t.modelsEmb);
						}
						t.w(`finished upgrading to version: ${t.configGlobal.version.v}`);

						t.working = 0; t.cancel = 0;
						t.charNew.working = 0; t.charNew.cancel = 0;
						t.memNew.working = 0; t.memNew.cancel = 0;

						await t.urlTest(); //will do list
					}
					this.w(l.files[0])
					this.w(fr.addEventListener("load", async (event) => {
						t.inited = 2;
						await parse(d);
						t.inited = 1;
					}));
					fr.readAsText(l.files[0]);
				},
				save() {
					let name = '';
					main: for (const i in this.nicks) {
						name += this.nicks[i].n + '-';
					}
					name = 'chat.' + name.slice(0, -1);

					this.saveDl(this.$data, name);
				},
				saveDl(d, n) {
					n = n.replace(/[^\w\d\. -]/gis, '');
					n = n.match(/^(.{1,32})/);
					n = n[1] ?? 'something';
					n = `${n}.${Date().toString()}.json`;

					const blob = new Blob([JSON.stringify(d)], { type: "text/json" });
					const l = document.createElement("a");
					l.download = n;
					l.href = window.URL.createObjectURL(blob);
					l.dataset.downloadurl = ["text/json", l.download, l.href].join(":");

					l.dispatchEvent(
						new MouseEvent("click", {
							view: window,
							bubbles: true,
							cancelable: true,
						})
					);
					l.remove()
				},
				optResSave() {
					const name = `Optimize_results.${Date().toString()}.html`;
					const blob = new Blob(["<html>" + document.getElementById('css').outerHTML + "<body>" + document.getElementById('optRes').outerHTML + "</body></html>"], { type: "text/html" });
					this.w({ blob: blob });
					const l = document.createElement("a");
					l.download = name;
					l.href = window.URL.createObjectURL(blob);
					l.dataset.downloadurl = ["text/html", l.download, l.href].join(":");

					l.dispatchEvent(
						new MouseEvent("click", {
							view: window,
							bubbles: true,
							cancelable: true,
						})
					)
					l.remove()

				},
				async list() {
					this.inited = 2;
					await this.listDo();
					this.inited = 1;
				},
				async listDo() {
					if (this.working) {
						this.w('working right now, leaving');
						return;
					}
					this.working = 1;
					this.modelsLoading.inited = 0;
					this.modelsLoading.total = 0;
					this.modelsLoading.done = 0;
					this.w(`listing models`);

					const isOpenRouter = this.isOpenRouter();
					const endpoint = isOpenRouter ? "/models" : "/api/tags";
					const headers = this.getHeaders();

					await fetch(this.url() + endpoint, {
						"method": "GET",
						"headers": headers
					}).then(r => {
						if (!r.ok) throw new Error(r.statusText);
						return r.text();
					}).then(async (r) => {
						let res = '';
						this.w(`parsing list reply`);
						try { res = JSON.parse(r) } catch (error) { console.error(`error: ${error}`) }
						let old = {
							model: [...this.models]
							// modelsEmb removed since it's hardcoded
						};
						this.w({ oldModels: old });
						this.models = [];
						// modelsEmb is now hardcoded, no need to clear it
						this.w({ modelsDL: res });
						let mdls = [];
						this.modelsLoading.inited = 2;

						if (isOpenRouter) {
							// OpenRouter API response format
							this.modelsLoading.total = res.data.length;

							for (const m of res.data.sort((a, b) => {
								return a.id.localeCompare(b.id.toLowerCase());
							})) {
								mdls.push({
									tag: m.id,
									n: `${m.id}`,
									mt: null,
									s: null,
									ps: null,
									q: null,
									ctx: m.context_length || null,
									emb: false // OpenRouter doesn't have embedding models in this context
								});
								this.w(`processed model ${m.id}`);
								this.modelsLoading.done++;
							}
						} else {
							// Ollama API response format
							this.modelsLoading.total = Object.keys(res.models).length;

							for (const m of Object.keys(res.models).sort((a, b) => {
								return res.models[a].name.localeCompare(res.models[b].name.toLowerCase());
							})) {
								let md = res.models[m];
								mdls.push({
									tag: md.name,
									n: `${md.name} (${md.details.parameter_size} ${md.details.quantization_level})`,
									mt: md.modified_at,
									s: md.size,
									ps: md.details.parameter_size,
									q: md.details.quantization_level,
									ctx: null,
								});
								await this.modelData(mdls, mdls.length - 1);
								this.w(`processed model ${md.name}`);
								this.modelsLoading.done++;
							}
						}

						this.w('processed new models');
						for (const m of mdls) {
							// All models go to regular models array, modelsEmb is hardcoded
							this.models.push(m);
						}

						if (!this.models.length) {
							this.w('no models found');
							this.working = 0;
							this.connection = 1;
							this.connectionErr = '';
							if (!isOpenRouter) {
								this.pToggle('pull', 1);
							}
							return;
						}

						//this section had too many copy-pastes, one day it needs to be redone )).
						//but we can just wait 1-2 years till llm can do that, right? )
						//thank you, llm of the future! ))
						var horror = { model: 'models' }; // Removed modelEmb since it's hardcoded
						for (const i in horror) {
							if (!this.settingsGlobal.req[i].v.l.length) {
								this.settingsGlobal.req[i].v.v = '';
								continue;
							}
							let m = this.settingsGlobal.req[i].v.v;
							let found = -1;

							if (!old[i].length) {
								this.w(`no old model list found for ${i}`);
							} else if (m > (old[i].length - 1)) {
								this.w(`selected ${m} value ${m} for strange reason is larger than old array: ${old[i].length - 1}`);
							} else if (m != null && m !== '') {
								this.w(`searching for previously selected models in new list ${i} ${m} ${old[i].length}`);
								this.w({ old: old });

								for (let M = 0; M < this.$data[horror[i]].length; M++) { //>
									if (old[i][m].n === this.$data[horror[i]][M].n) {
										found = M;
										this.w(`found matching model #${M} ${this.$data[horror[i]][M].n}`)
										break;
									}
								}
							} else {
								this.w(`no model selected globaly, skipping and setting the first one`);
							}

							if (found == -1) found = 0; this.settingsGlobal.req[i].v.v = found;
							this.w(`globally set model ${this.$data[horror[i]][this.settingsGlobal.req[i].v.v].n}`);
						}

						for (const i in horror) {
							this.w(`setting ${i}`);
							for (let u in this.nicks) {
								u = this.nicks[u];
								if (!u.hasOwnProperty('settings')) continue;
								if (!u.settings.req[i].v.l.length) {
									u.settings.req[i].v.v = '';
									continue;
								}
								let found = -1;
								let us = u.settings.req[i].v;
								if (!old[i].length) {
									this.w(`no old model list found for ${i}`);
								} else if (us.v > (old[i].length - 1)) {
									this.w(`selected ${i} value ${us.v} for strange reason is larger than old array: ${old[i].length - 1}`);
								} else if (us.v != null && us.v !== '') {
									for (let m = 0; m < this.$data[horror[i]].length; m++) { //>
										if (old[i][us.v].n === this.$data[horror[i]][m].n) {
											found = m;
											this.w(`found matching model #${m} for user ${u.n}`);
											break;
										}
									}
								}
								if (found == -1) found = 0; us.v = found;
								this.w(`user ${u.n} set model ${this.$data[horror[i]][us.v].n}`);
							}
						}

						this.w({ 'models': this.models.length });
						this.connectionErr = '';
						this.connection = 1;
						this.cancel = 0;
						this.working = 0;

					}).catch((error) => {
						this.cancel = 0;
						this.working = 0;
						this.modelsLoading.inited = 0;
						this.connectionErr = error.message;
						this.connection = 0;
						this.w(`listing conneciton err: ${error.message}`);
						return;
					});
					this.modelsLoading.inited = 1;
				},
				async modelData(mdls, id) {
					return fetch(this.url() + "/api/show", {
						"method": "POST",
						'body': JSON.stringify({ name: mdls[id].tag }),
					}).then(r => {
						if (!r.ok) throw new Error(r.statusText);
						return r.text();
					}).then(r => {
						let res = '';
						try { res = JSON.parse(r) } catch (error) {
							console.error(`error: ${error}`)
						}
						this.w({ 'pulled model data': res });
						if (res.hasOwnProperty('parameters')) {
							this.w({ 'has parameters specified': res.parameters });
							let tmp = res.parameters.match(/.*num_ctx\s+(\d+)/);
							if (tmp && tmp[1]) {
								this.w(`modelfile of ${mdls[id].n} has num_ctx: ${tmp[1]}`);
								mdls[id]['ctx'] = tmp[1];
							}
						}
						if (res.details.hasOwnProperty('family')) {
							let tmp = res.details.family.match(/\bbert\b/i);
							mdls[id].emb = tmp == null ? false : true;
							this.w(`${mdls[id].n} embedded status: ${mdls[id].emb}`);
						}
					}).catch((error) => {
						this.connectionErr = error.message;
						this.connection = 0;
						return;
					});
				},
				loadFile(n) {
					this.w(`loading file for ${n}`);

					const l = document.getElementById('load' + n);
					let fr = new FileReader();
					let t = this;
					let d;
					async function parse(n, d) {
						t.w(`loading: ${n}`);
						if (n === 'bgImg') {
							//fetch('/img.jpg').then((r)=>{
							//	return r.blob();
							//}).then((r)=>{
							//document.getElementById('bg').style.backgroundImage="url("++")";
							//this.bgImg=URL.createObjectURL(r);
							//});
							console.log('loading' + n);
							t.config.bgImg.v = d;//URL.createObjectURL(d);
							t.bgSet(t.config.bgImg.v);
						} else if (n === 'img') {
							t.imgs.push(d.replace('data:', '').replace(/^.+,/, ''));
							t.w(`loaded images ${t.imgs.length}`);
						} else if (n === 'card') {
							t.cardLoad(d);
						}
					}
					this.w(`file: ${l.files[0]}`);
					this.w(fr.addEventListener("load", function () { parse(n, fr.result) }))
					fr.readAsDataURL(l.files[0]);
					//fr.readAsBinaryString(l.files[0]);
				},
				bgFix(v) {
					if (v) {
						document.getElementById('body').style.backgroundAttachment = 'fixed';
					} else {
						document.getElementById('body').style.backgroundAttachment = 'scroll';
					}
				},
				bgSet(d) {
					document.getElementById('body').style.backgroundImage = `url(${d})`;
					document.getElementById('body').style.backgroundSize = '100% auto';
					document.getElementById('body').style.backgroundRepeat = 'repeat-y';
				},
				pull() {
					this.working = 1;
					this.connectionErr = '';

					fetch(this.url() + "/api/pull", {
						"method": "POST",
						"body": JSON.stringify({
							'name': this.modelPull,
						})
					}).then(r => {
						if (!r.ok) throw new Error(r.statusText);
						return r.body;
					}).then(r => {
						this.w('dissecting response');
						const t = this;
						const decoder = new TextDecoder('utf-8');
						const reader = r.getReader();
						let res = '', buf = '';
						this.mpull = [{ status: '' }];

						reader.read().then(function processText({ done, value }) {
							if (done) {
								t.w({ 'Stream complete': res });
								t.cancel = 0;
								return true;
							}
							if (t.cancel) {
								t.w('cancelling');
								reader.cancel();
								reader.releaseLock();
								t.cancel = 0;
								return 'cancel';
							}
							buf = decoder.decode(value);
							const chnks = buf.trim().split('\n');
							//t.w(buf);

							for (const ch of chnks) {
								try { res = JSON.parse(ch) } catch (error) { t.w(`error: ${error}`) }
								if (res.hasOwnProperty('error')) {
									reader.cancel();
									reader.releaseLock();
									t.cancel = 0;
									return res.error;
								}
								if (res.status != t.mpull[t.mpull.length - 1].status) {
									t.mpull.push({ 'status': res.status });
								}
								let p = t.mpull[t.mpull.length - 1];
								if (res.status && res.total) {
									p.total = res.total;
									p.done = res.completed;
									if (!p.done) {
										p.prcnt = 0
									} else {
										p.prcnt = Math.floor(100 / (p.total / p.done))
									}
								}
							}
							return reader.read().then(processText);
						}).then(r => {
							t.w(`model pull attempt is finished, status ${r}`);
							t.working = 0;
							t.cancel = 0;
							if (r === true || r === 'cancel') {
								t.connectionErr = '';
								t.pToggle('pull', 0);
								t.listDo();
							} else {
								t.connectionErr = r;
							}
						}).catch((error) => {
							t.working = 0;
							t.cancel = 0;
							t.connectionErr = error.message;
							t.connection = 0;
							return;
						});
					}).catch((error) => {
						this.working = 0;
						this.cancel = 0;
						this.connectionErr = error.message;
						return;
					});
				},
				updateAddParams(d, p) {
					this.w(`updateAddParams for key ${p}`);
					if (!d.hasOwnProperty(p)) {
						this.w(`loaded file doesn't have whole section ${p}, importing`);
						d[p] = this['def'][p];
						return;
					}
					for (let i in this['def'][p]) {
						this.w(`checking property ${i}`)
						if (d[p].hasOwnProperty(i)) {
							this.w(`skipping param ${i}, already exists in loaded file`);
						} else {
							this.w(`adding param ${i} to loaded file`);
							d[p][i] = this['def'][p][i]
						}
					}
				},
				shuffle() {
					return ([...arr], n = 1) => {
						let m = arr.length;
						while (m) {
							const i = Math.floor(Math.random() * m--);
							[arr[m], arr[i]] = [arr[i], arr[m]];
							return arr.slice(0, n);
						};
					}
				},

				//rag methods
				loadRag() {
					this.w('starting loading rag');

					const l = document.getElementById('loadRag');
					let fr = new FileReader();
					let t = this;
					let d;
					async function parse(d) {
						t.w({ parsing: d });
						for (const l of d.split('\n')) {
							t.w(`embedding ${l}`)
							t.rag[-1].v.push(await t.embed(l));
						}
					}
					this.w(`file: ${l.files[0]}`);
					this.w(fr.addEventListener("load", function () { parse(fr.result) }))
					fr.readAsText(l.files[0]);

				},
				ragStrct() {
					return {
						v: [],
						t: '',
						doing: false,
						done: 0,
						total: 0,
						last: [],
						modelEmb: '',
						err: null
					};
				},
				async ragU(u) {
					if (u == null) return;
					// Since embedding model is hardcoded, no need to check if models are available
					this.workingRag = true;
					this.w(`updating rag for user ${u}`);

					let r = this.rag[u], p = []; const old = r.v;
					r.modelEmb = 'nomic-embed-text:latest'; // Hardcoded embedding model
					r.v = [];
					txt: for (let l of this.rag[u].t.split('\n')) {
						l = l.trim(); if (!l.length) continue;
						for (const o of old) {
							if (o[1] === l) {
								this.w(`using existing embedding for ${l}`);
								r.v.push(o);
								continue txt;
							}
						}
						p.push(l);
					}
					r.done = 0; r.total = p.length; r.doing = true;
					this.w(`rag paragraphs: ${p.length}`);
					for (let P = 0; P < p.length; P++) { //>
						const e = await this.embed(p[P]);
						if (!e.length) continue;
						r.v.push(e);
						r.done = P + 1;
					}
					r.doing = false;
					this.workingRag = false;
				},
				cosine(A, B) {
					let dotproduct = 0, mA = 0, mB = 0;

					this.w(`cosine ${A.length} ${B.length}`);
					for (let i = 0; i < A.length; i++) {//>
						dotproduct += A[i] * B[i];
						mA += A[i] * A[i];
						mB += B[i] * B[i];
					}
					mA = Math.sqrt(mA); mB = Math.sqrt(mB);

					let s = dotproduct / (mA * mB);
					this.w(`cosine ${dotproduct} ${mA} ${mB}`)

					return s;
				},
				async embed(txt) {
					if (this.isOpenRouter()) {
						this.w('Embeddings not supported for OpenRouter API');
						this.rag.err = 'Embeddings not supported for OpenRouter API';
						return [];
					}

					if (txt == null || !txt.length) return;
					let opt = {};
					opt['model'] = 'nomic-embed-text:latest'; // Hardcoded embedding model
					opt['prompt'] = txt.trim();
					this.w({ opt: opt });
					const t = this;

					let r, d;
					try {
						r = await fetch(this.config.urlEmb.v + "/api/embeddings", { // Use configured embedding URL
							"method": "POST",
							"body": JSON.stringify(opt)
						});
						if (!r.ok) throw new Error(r.statusText);
					} catch (err) {
						t.w(`Error: ${err}`);
						t.rag.err = `${err}`;
						return [];
					}
					t.rag.err = null;
					d = await r.json();
					t.w(`embed received ${d.embedding}`);
					return [d.embedding, txt];
				},

				//group methods
				//user methods
				userGroupDel(g, i) {
					if (g == 0 && !confirm(`This is the list of all users, if you delete character "${this.nicks[i].n}", it will be gone permanently. The messages will stay but not the character. Are you sure you wish to delete this character?`)) {
						return;
					}
					this.userGroupDelDo(g, i);
				},
				userGroupDelDo(g, i) {
					if (!this.groups[g].u[i]) return 0;
					this.w(`removing user ${i} from group ${g}`)
					const n = this.nicks[i];
					if (this.groups[g].sel[n.t] == i) {
						this.w(`user is the selected one in the group, removing.`);
						for (const j in this.groups[g].u) {
							this.w(`comparing nick ${j} with ${i}`);
							if (j == i || this.nicks[j].t != n.t) continue;
							this.w(`found matching role user "${this.nicks[j].n}" with id ${j} in group ${g}`);
							this.groups[g].sel[n.t] = j;
							break;
						}
						if (this.groups[g].sel[n.t] == i) {
							this.w(`we have not found any other user of this type in the group, setting selected one to null`);
							this.groups[g].sel[n.t] = null;
						}
					} else {
						this.w(`user ${i} is not selected one`);
					}
					for (const u in this.groups[g].u) {
						delete this.groups[g].u[u][i];
					}

					this.groups[g].an[n.t]--;
					this.groups[g].an['t']--;
					delete this.groups[g].u[i];
				},
				userDel(i) {
					if (confirm(`Are you Really sure you wish to completely delete "${this.nicks[i].n}"? It won't affect the existing chat but will delete the nick and its system and instruction messages.`)) {
						this.userDelDo(i)
					}
				},
				userDelDo(i) {
					const t = this.nicks[i].t;
					for (const g in this.groups) {
						this.userGroupDelDo(g, i);
					}
					this.amountNicks['t']--;
					this.amountNicks[t]--;
					this.nicks[i].del = 1;

					for (const t of this.turns) {
						for (const b of t.branches) {
							for (const m of b.msgs) {
								delete m.nicks[i];
								m.nicksArr = this.msgUserListAll({ nicks: m.nicks }); //caches are so caches.
							}
						}
					}
				},
				userGroupAdd(g, u) {
					if (u == null) return;
					this.w(`adding user ${u} to group ${g}`);
					const t = this.nicks[u].t;
					this.groups[g].an['t']++;
					this.groups[g].an[t]++;
					this.groups[g].u[u] = {};
					for (const i in this.groups[g].u) {
						this.groups[g].u[u][i] = true;
						this.groups[g].u[i][u] = true;
					}
					if (this.groups[g].sel[t] === null) {
						this.groups[g].sel[t] = u;
					}
				},
				groupDel(g) {
					if (this.groups.length <= 1) { //>
						alert('Can not delete the only group.');
						return;
					}
					for (const i in this.groups) {
						if (i == g) continue;
						this.group = i * 1; //yep
						break;
					}

					this.w(`new chosen group is ${this.group}`);
					for (const u in this.groups[g].u) {
						this.userGroupDel(g, u);
					}
					this.groups.splice(g, 1);
				},
				async userAdd(t, n, d) {
					const id = this.amountNicks['idNext']++;
					this.amountNicks['t']++;
					this.amountNicks[t]++;
					this.nicks[id] = { t: t, n: n, 'id': id, del: 0, system: (d.system ?? ''), instr: (d.instr ?? ''), sets: false, setsDo: false };
					this.nick['n'][t] = '';
					this.rag[id] = this.ragStrct();
					this.userGroupAdd(0, id);

					if (d.hasOwnProperty('mem') && d.mem.length) {
						this.rag[id].t = d.mem;
						await this.ragU(id);
					}
					if (d.hasOwnProperty('knlg') && d.knlg.length) {
						this.rag.g.t += '\n' + d.knlg;
						await this.ragU('g');
					}

					this.w({ user: this.nicks[id], d: d });
					return id;
				},
				userVis(t, id) {
					//this.w(`checking vis of ${id}`);
					const u = this.nicks[id];
					//this.w(`checking vis of ${id} ${u.n}: ${u.del}`);
					if (t !== u.t) return 0;
					if (u.del == 1) return 0;
					//if(!this.groups[this.group]) return 0;
					//if(!this.groups[this.group].u[u.id]) return 0;
					return 1;
				},
				userCh(t, v) {
					this.w(`userch ${t}`);
					if (t === 'u') {
						this.w('chosen user nick has changed, let us update side msg if it is open and turns');
						//this.turnLastFilteredGo();
						const tbm = this.tbma(this.turn);
						if (this.msgSide(this.msga(this.turn))) this.msgSideNickUpdate(...tbm);
					}
				},
				userAiCh(v) {
					this.w('chosen ai nick has changed, let us update turns');
					//this.turnLastFilteredGo();
				},
				userTypeCh(u) {
					const t = this.nicks[u].t;
					const tn = (t == 'u' ? 'a' : 'u');
					this.nicks[u].t = tn;
					//sigh, these had to be auto but..
					for (const g in this.groups) {
						if (!this.groups[g].u[u]) continue;
						this.groups[g].an[t]--;
						this.groups[g].an[tn]++;
						if (this.groups[g].sel[t] == u) {
							for (const j in this.groups[g].u) {
								if (this.userVis(t, j)) {
									this.groups[g].sel[t] = j;
									break;
								}
							}
							if (this.groups[g].sel[t] == u) this.groups[g].sel[t] = null
						}
						if (this.groups[g].sel[tn] == null) this.groups[g].sel[tn] = u;
					}
					if (t === 'u') {
						this.w(`searching for side msgs of a user`);
						this.msgSideWipe(u);
					}
					this.amountNicks[t]--;
					this.amountNicks[tn]++;
				},
				msgSideWipe(u) {
					//used when user changes type or when we move/copy branches,
					//to prevent adding branch after the side message, which is supposed to be always last.
					for (let t = 1; t < this.turns.length; t++) { //>
						for (let b = 0; b < this.turns[t].branches.length; b++) { //>
							let mdel = [];
							for (let m = 0; m < this.turns[t].branches[b].msgs.length; m++) { //>
								const msg = this.msgGet(t, b, m);
								if ((u == null || msg.nId == u) && this.msgSide(msg)) {
									this.w(`found a sidemsg ${t}/${b}/${m}: deleting`);
									this.branchDel(t, b, m)
									m--;
								}
							}
						}
					}
				},
				async msgDelNext(t, b, m) {
					if (t < 1) return; //>
					const msg = this.msgGet(t, b, m);
					if (this.working == 1 && msg.working) return;

					const role = this.msgRole(msg);
					if (role == 'a' && this.turns[t].branches[b].msgs.length == 1) {
						await this.msgMvRight(t, 0, true);
					}
					this.branchDel(t, b, m);
				},
				branchMerge(t, b, m, t2, b2, mdel) {
					if (!this.delAtWork(this.$data)) return;
					this.msgSideWipe(null);
					this.branchMv(t, b, m, t2, b2);
					this.branchDel(t2, b2, mdel);
					this.turns[t2].branches[b2].msg = this.turns[t2].branches[b2].msgs.length - 1;
				},
				branchMv(t, b, m, t2, b2) {
					if (!this.delAtWork(this.$data)) return;
					this.w(`Moving branch ${t}/${b}/${m} -> ${t2}/${b2}`);
					this.msgSideWipe(null);
					let branch = { msgs: [] };
					this.branchCopy(branch, t + 1, b, m);
					let tmp = []; this.copy(this.turns[t].branches[b].msgs, tmp, m);
					this.turns[t2].branches[b2].msgs.push(tmp[m]);
					let m2 = this.turns[t2].branches[b2].msgs.length - 1;
					this.turns[t2].branches[b2].msg = m2;
					if (branch.nested) this.branchAdd(branch.nested, t2 + 1, b2, m2);
					this.w({ turns: this.turns });
					this.branchDel(t, b, m);
					this.turns[t2].branches[b2].msg = this.turns[t2].branches[b2].msgs.length - 1;
					this.branchu(0);
				},
				branchAdd(n, t, bp, mp) {
					this.w({ branchAdd: 'start', turn: t, n: n, bp: bp, mp: mp });
					this.msgSideWipe(null);

					this.branchu(0); //dirty patch

					if ((t + 1) > this.turns.length) {
						this.turnnew(t - 1, -1, this.group);
						this.turns[t].branches = [];
					}
					let b = this.turns[t].branches.length;
					this.turns[t].branches.push(n.branch);
					let br = this.turns[t].branches[b];
					this.treeuDo(this.turns[t].tree, bp, mp, b);
					//this.branchu(t);
					this.w({ turn: t, bp: bp, mp: mp, b: b, newTree: this.turns[t].tree })
					for (let m = 0; m < br.msgs.length; m++) { //>
						if (!br.msgs[m].hasOwnProperty('nested')) {
							continue;
						}
						this.branchAdd(n.branch.msgs[m].nested, t + 1, b, m);
						delete br.msgs[m].nested;
					}
				},
				branchCopy(msg, t, bp, mp) {
					this.w(`moving branch: t:${t}, bp:${bp}, mp: ${mp}`);
					if (this.turns[t] == undefined) return;
					const tree = this.turns[t].tree;
					if (tree == undefined) return;

					if (!tree.hasOwnProperty(bp) || !tree[bp].hasOwnProperty(mp)) return;
					msg.nested = {}; let n = msg.nested;

					let b = this.turns[t].tree[bp][mp];
					let tmp = {}; this.copy(this.turns[t].branches, tmp, b);
					n.branch = tmp[b];
					for (let i = 0; i < n.branch.msgs.length; i++) { //>
						let m = n.branch.msgs[i];
						this.branchCopy(m, t + 1, b, i);
					}
				},
				branchDel(t, bp, mp) {
					if (!this.delAtWork(this.$data)) return;
					this.w({ branchDel: 'start', t: t, bp: bp, mp: mp });

					this.branchDelNext(t + 1, bp, mp);
					//we need to delete the message at this turn,
					//so in the next one we will shift index ids, if the next turn exists.
					if (this.turns[t + 1] != undefined) this.treeDelShift(this.turns[t].branches[bp].msgs.length - 1, this.turns[t + 1].tree[bp], mp);

					if (this.turns[t].branches[bp].msgs.length > (mp + 1)) {
						this.turns[t].branches[bp].msg = mp;
					} else if (mp > 0) {
						this.turns[t].branches[bp].msg = mp - 1;
					} else {
						//empty turn
					}

					this.turns[t].branches[bp].msgs.splice(mp, 1);
					//if the branch is empty, let's delete the branch
					if (!this.turns[t].branches[bp].msgs.length) {
						//but for this we need first to find the parent branch/msg ids, to update the next turns index
						let pb, pm;
						for (const i in this.turns[t].tree) {
							for (const j in this.turns[t].tree[i]) {
								if (this.turns[t].tree[i][j] == bp) {
									pb = i; pm = j;
									break;
								}
							}
						}
						//del current emptied branch and shift everything below.
						this.branchDelNext(t, pb, pm);
					}

					//delete the turn if it was emptied.
					this.branchDelTurnDel(t);

					this.branchu(t);
				},
				branchDelNext(t, bp, mpo) {
					if (this.turns[t] == undefined) return;

					this.w(`deleting branch: t:${t}, bp:${bp}`);

					let del = [];

					for (const mp in this.turns[t].tree[bp]) {
						//for the first nested level we delete only 1 nested branch of the parent branch/msg, 
						//as other nested branches are tied to other parent messages that are still there.
						//but for the rest of levels we delete all nested branches for all parent messages as the whole tree gets deleted.
						if (mpo != null && mp != mpo) continue;
						let b = this.turns[t].tree[bp][mp];

						this.branchDelNext(t + 1, b, null);

						del.push(b);
						if (this.turns[t].branch == b) this.turns[t].branch = -1;
					}

					//process from end to beginning, so branch indexes to delete are not changed by deletions
					del.sort((a, b) => b - a);
					this.w({ delBranch: del });
					for (let d = 0; d < del.length; d++) { //>
						let b = del[d];
						this.branchDelDo(t, b);
					}
					//del the turn if it was emptied.
					this.branchDelTurnDel(t);

					this.branchu(t);
				},
				branchDelTurnDel(t) {
					if (t >= this.turns.length) return;

					if (this.turns[t].branches.length == 0) {
						this.w({ turndel: 'no branches', turn: t, brLen: this.turns[t].branches.length });
						this.turns.splice(t);
						return true;
					}
					let count = 0;
					for (const b of this.turns[t].branches) {
						count += b.msgs.length;
						//this.w({turndelcount:'goes', msgsl:b.msgs.length,turn:t,b:b})
					}

					if (!count) {
						this.w({ turndel: 'no msgs', turn: t, brLen: this.turns[t].branches.length, msgs: count });
						this.turns.splice(t);
					}

					return count == 0 ? true : false
				},
				branchDelDo(t, b) {
					this.w(`Deleting all local branches at ${t}: parent branch ${b}`);
					this.treeDelShiftLocal(t, b);
					this.treeDelShiftNested(t, b);
					this.turns[t].branches.splice(b, 1);
				},
				treeDelShiftNested(t, b) {
					this.w(`Tree del shift at turn ${t} ${t + 1}>=${this.turns.length}`);
					if ((t + 1) >= this.turns.length) return;
					this.w(`Doing tree del shift at turn ${t}`);
					this.treeDelShift(this.turns[t].branches.length - 1, this.turns[t + 1].tree, b);
				},
				treeDelShiftLocal(t, b) {
					//we have deleted a local branch, now the values pointing to the rest of them are wrong
					//lets go and shift them.
					this.w({ treelocaldel: this.turns[t].tree });
					for (const i in this.turns[t].tree) {
						for (const j in this.turns[t].tree[i]) {
							if (this.turns[t].tree[i][j] > b) {
								this.turns[t].tree[i][j]--;
							} else if (this.turns[t].tree[i][j] == b) {
								delete this.turns[t].tree[i][j];
							}
						}
					}
					this.w({ treelocaldeldone: this.turns[t].tree });
				},
				treeDelShift(total, tree, i) {
					//we have deleted parent element - branch or message, now the index is wrong
					//let's go over the index and shift keys linking parent elemets to local branches.
					this.w(`The element #${i} is ${total - i} positions from the end`);
					if (tree == undefined) {
						this.w(`tree index doesn't exist`);
						return;
					}
					this.w({ treedel: tree, e: i + 1, l: total });
					delete tree[i];
					let ps = Object.keys(tree).filter(k => k > i).sort((a, b) => a - b);
					this.w({ parentIdsToShift: ps });
					//for(let e=i*1+1;e<=total;e++) { //>
					for (const e of ps) { //>
						this.w(`Updating index tree ${e} -> ${e - 1}`);
						tree[e - 1] = tree[e];
						delete tree[e];
					}
					this.w({ treedeldone: tree })
				},
				groupAdd(n, u) {
					if (!n.length) {
						alert('Please, give it a name');
						return;
					}
					this.groups.push(this.groupTmpl(n, u));
					for (const i of u) {
						this.userGroupAdd(this.groups.length - 1, i);
					}
					this.group = this.groups.length - 1;
				},
				groupTmpl(n, u) {
					let g = { u: {}, sel: { u: null, a: null, s: null }, an: { u: 0, a: 0, s: 0, t: 0 } };
					g.n = n;
					return g;
				},
				groupPrev() {
					if (this.group > 0) this.group--;
				},
				groupNext() {
					if (this.group < (this.groups.length - 1)) this.group++; //>
				},
				userS(t) {
					const u = this.userSelected(t);
					//this.w(`returning select user ${t}=${u}`);
					return u;
				},
				userSelected(t) {
					if (!this.groups[this.group]) return null;
					return this.groups[this.group]['sel'][t];
				},
				copy(o, on, k) {
					//this.w({parsing:o})
					if (o[k] == null) {
						on[k] = null
					} else if (Array.isArray(o[k])) {
						on[k] = [];
						//this.w(`copying arr ${k}`);
						for (const i in o[k]) { this.copy(o[k], on[k], i) }
					} else if (typeof o[k] === 'object') {
						on[k] = {};
						//this.w(`copying object ${k}`);
						for (const i in o[k]) { this.copy(o[k], on[k], i) }
					} else {
						//this.w(`copying val ${k}`);
						on[k] = o[k];
					}
				},
				userSetsPerAi(id) {
					if (id == null) return;
					const u = this.nicks[id];
					console.log(`personal sets sets for ${id}: ${u.setsDo}`)
					if (u.setsDo) {
						if (!u.hasOwnProperty('settings')) {
							u.config = { ...this.configGlobal };
							u.settings = {};
							u.settings['req'] = { ...this.settingsGlobal.req };
							u.settings['options'] = { ...this.settingsGlobal.options };
							this.copy(this.$data, u, 'settingsGlobal');
							this.copy(this.$data, u, 'configGlobal');
							u.settings = u.settingsGlobal; delete u.settingsGlobal;
							u.config = u.configGlobal; delete u.configGlobal;
							u.settings.req.model.v.l = computed(() => this.models);
							u.settings.req.modelEmb.v.l = computed(() => this.modelsEmb);
						}
					}
					u.sets = u.setsDo;
				},

				//turn methods
				tbma(t) {
					return [t, this.branch(t), this.brancha(t).msg];
				},
				async turnUp() {
					event.preventDefault();

					if (this.turn <= 1) return; //>
					const start = this.turn;

					let atVisible = !this.msgSkipped(...this.tbma(this.turn));
					while (!atVisible && this.turn > 1) {
						this.turn--;
						atVisible = !this.msgSkipped(...this.tbma(this.turn));
					}
					if (start !== this.turn) return;
					this.turn--;
					while (this.msgSkipped(...this.tbma(this.turn)) && this.turn > 1 && atVisible) {
						this.w(`we went up one message at turn ${this.turn} but it's hidden, let's go higher`)
						atVisible++;
						this.turn--;
					}
					this.w(`stop at turn ${this.turn}`);
					await nextTick();
					this.scroll(null, 0);
				},
				async turnDown(m) {
					event.preventDefault();

					const last = this.turnLast(this.turn);
					let lastv = null;

					if (m) {
						this.turn = last;
						await nextTick();
						this.scroll(null, 0);
						return;
					}

					if (!this.turnNotLast(this.turn)) return;

					lastv = this.turn;
					let t = this.turn + 1;
					while (t <= last) { //>
						this.w(`trying next turn ${t}`);
						if (!this.msgSkipped(...this.tbma(t))) {
							lastv = t;
							break;
						}
						t++;
					}
					if (t > last) t = last;
					//this.turn=lastv; //it was a different logic attempt but interface was not good
					this.turn = t;

					await nextTick();
					this.scroll(null, 0);
				},
				turnLastFilteredGo() {
					this.turnDown(1)
				},
				turnNotLast(t) {
					if (t >= (this.turns.length - 1)) return null;
					if (this.turns[t + 1].branch == -1) return null;
					return 1;
				},
				turnOff(t) {
					this.turnBranchSet(t, -1);
				},
				turnwhose(turn) {
					//sets the legacy turn.role which should not be used anymore
					this.w(`searching for whose turn is at ${turn}`);
					let prev = this.turns[turn - 1];
					let ai = prev.role == 'user' ? 1 : 0;
					this.w(`new turn type is ai: ${ai}`);
					return ai;
				},
				turnnew(turn, u, g) {
					turn++;
					this.w(`generating new turn #${turn}`);
					if (this.turns[turn]) {
						this.w(`next turn is already there, skipping creation of the turn`);
					} else {
						this.w(`the turn ${turn} doesn't exist, let's create it`);
						let ai = this.turnwhose(turn);
						this.turns.push({
							'role': (ai ? 'assistant' : 'user'), //should not be used anymore
							'branches': [],
							'branch': 0,
							'tree': {},
						});
						this.turns[this.turns.length - 1].tree[this.turns[turn - 1].branch] = {};
					}
					this.turn = turn;
					this.w(`set turn to ${turn}`);
					this.w(`initialize the first branch at turn ${turn}`);
					this.branchNew(turn, u, g);
					this.w({ 'current turn': this.turns[turn] });
				},
				turnBranchSet(t, b) {
					this.turns[t].branch = b;
				},
				turnLast(t) {
					const start = t;
					while (this.turns[t] && this.turns[t].branch !== -1) {
						t++;
					}
					this.w(`turn last ${t} turn start ${start}`)
					return t - 1;
				},
				turnRole(t) {
					//should not be used anymore
					return this.turns[t].role;
				},

				send(e, m, i) {
					if (e.key === 'Enter' && e.shiftKey) {
						return;
					}
					this.chat(m, i, true);
				},

				//branch methods
				branchNew(turn, u, g) {
					this.w(`adding new branch at ${turn}`)
					if (!this.turns[turn]) return;
					const prev = this.turns[turn - 1];
					this.w(`prev branch: ${prev.branch}`);

					const prevm = prev.branches[prev.branch].msg;
					let bnew = 0;
					let b = '';
					if (!this.turns[turn].tree[prev.branch]) bnew = 1;
					if (!bnew) {
						b = this.turns[turn].tree[prev.branch][prevm];
						bnew = (b && this.turns[turn].branches[b]) ? 0 : 1;
					}
					if (!bnew) {
						this.w(`branch for the msg ${prevm} in turn ${turn} already exists: ${b}`);
					} else {
						this.w(`creating new branch at turn ${turn}`)
						this.turns[turn].branches.push(this.branchTmpl(turn, u, g));
						b = this.turns[turn].branches.length - 1;
					}
					this.turnBranchSet(turn, b);
					this.w(`new branch id: ${b}`);
					this.w({ 'created branch in turn': turn, 'branch': this.turns[turn].branches[this.turns[turn].branch] });
					if (bnew) this.treeu(turn);
				},
				branchTmpl(turn, u, g) {
					this.w(`adding branch to turn ${turn}`);
					return { rated: false, msg: 0, msgs: [this.msgTmpl(u, null, g)] }
				},
				branch(turn) {
					return this.turns[turn].branch
				},
				brancha(turn) {
					//console.trace();
					return this.turns[turn].branches[this.branch(turn)];
				},
				branchNested(turn) {
					this.w(`searching for nested branch at ${turn} for parent active message`);
					const prev = turn - 1;
					const bprev = this.branch(prev);
					const tr = this.turns[turn].tree[bprev]; //tree[prev branch id]
					this.w({ 'index value for parent branch': bprev, 'tr': tr });
					if (!tr) return [null, null];
					const bn = tr[this.brancha(prev).msg]; //prev turn's branch/msg -> this branch id
					this.w(`index value of a local branch for the active message in parent branch: ${bn}`);
					if (bn == undefined) return [null, null];
					return [bn, this.turns[turn].branches[bn]];
				},
				branchu(turn) {
					this.w(`updating active branches for turn ${turn}`);
					let turnIncomplete = this.turns.length;
					for (let i = turn + 1; i < this.turns.length; i++) {//>
						this.w(`processing turn ${i}`);
						let [bn, b] = this.branchNested(i);
						if (bn == undefined || !this.msgInited(i, bn, b.msg)) {
							turnIncomplete = i;
							this.w({ 'leaving updating, setting turn': turnIncomplete, 'branch': b, bn: bn });
							break;
						}
						this.w(`updating turn: ${i}, branch ${this.turns[i].branch} -> ${bn} (content: ${b.msgs[b.msg].content3.a})`);
						this.turnBranchSet(i, bn);
					}

					for (let i = turnIncomplete; i < this.turns.length; i++) {//>
						this.w(`dropping branch for turn ${i}`);
						if (this.turns[i].branch == -1) break; //optimization, tho probably we don't even have to mark everything below? just 1.. 
						this.turnOff(i);
					}
					this.turn = turnIncomplete - 1;
					this.w(`branchu sets turns to ${this.turn}`);
				},
				treeu(turn) {
					this.w(`updating index tree at ${turn}`);
					let prev = this.turns[turn - 1];
					this.treeuDo(this.turns[turn].tree, prev.branch, prev.branches[prev.branch].msg, this.turns[turn].branch);
				},
				treeuDo(tree, bp, mp, b) {
					this.w(`Creating tree index for parents: ${bp}, ${mp}, local: ${b}`);
					if (!tree[bp]) tree[bp] = {};
					tree[bp][mp] = b;
				},


				//msg methods
				msgTmpl(u, c, g) {
					this.w(`adding message template for ${u}`);
					let nicks = {};
					if (g != null) {
						for (const i in this.groups[g].u[u]) {
							if (!this.groups[g].u[u][i]) continue;
							this.w(`adding user ${i} to visible list`);
							nicks[i] = true;
						}
					}
					nicks[u] = true;
					return {
						content: (c != undefined ? c : null),
						content3: {
							e: null,
							th: null,
							a: (c != undefined ? c : null)
						},
						'nick': this.nicks[u].n,
						'nId': u,
						'tp': {},
						'tr': {},
						'rating': null,
						status: this.msgStatusId('new'),
						edited: null,
						nicks: nicks, //for easier access
						nicksArr: this.msgUserListAll({ nicks: nicks }) //to avoid sorting every time chat is updated
					}
				},
				msgNew(turn, u, u2, c, g) {
					this.w(`adding new message to turn ${turn}, u:${u}, u2:${u2}, c:${c}, g:${g}`);
					let b = this.brancha(turn)
					let m = this.msgTmpl(u, c, g);

					if (b.msgs[b.msg].status == null) {
						b.msgs[b.msg] = m;
					} else {
						b.msgs.push(m);
					}
					b.msg = this.msgTotal(turn, this.branch(turn)) - 1;
					if (u2 != null) {
						this.w(`Attention, skipping creation of a pair message, because second user id is not specified. Can be normal for loading cards only right now.`)
						this.branchNew(turn + 1, u2, g);
					}
				},
				msgGet(t, b, m) {
					return this.turns[t].branches[b].msgs[m];
				},
				msgWaiting(m) {
					if (m.status == null) return 1;
					if (m.status == 0) return 1;
					return 0;
				},
				msgTotal(t, b) {
					return this.turns[t].branches[b].msgs.length;
				},
				msgEmpty(t, b, m) {
					const msg = this.msgGet(t, b, m);
					//this.w({msg:msg});
					return this.msgEmptyDo(msg);
				},
				msgEmptyDo(msg) {
					if (msg.images && msg.images.length) return 0;
					if (!this.config.trinity.v) {
						if (msg.content == null) return 1;
						if (!msg.content.length) return 1;
					} else {
						let count = 0, total = 0;
						for (const s in msg.content3) {
							total++;
							if (msg.content3[s] == null || !msg.content3[s].length) count++;
						}
						if (count === total) return 1;
					}
					return 0;
				},
				msgMvLeft(t) {
					let b = this.brancha(t);
					if (b.msg == 0) return;
					b.msg--;
					this.branchu(t);
					this.turn = t;
					this.msgSideNickUpdate(...this.tbma(t));
				},
				async msgMvRight(t, wSideRating, aw) {
					this.w(`moving right at turn ${t}, siderating: ${wSideRating}`);
					let b = this.brancha(t);
					if (!this.msgLast(t, this.turns[t].branch) && !wSideRating) {
						this.w(`it's not the last message: {b.msg}`);
						b.msg++;
						this.branchu(t);
						this.turn = t;
						this.msgSideNickUpdate(...this.tbma(t));
						return;
					}
					//add new message
					if (this.working) {
						this.w('working right now, leaving');
						return 0;
					}
					if (this.msgSide(this.msga(t))) return;
					let res;
					if (!aw) {
						this.chat((wSideRating ? 3 : 2), t, aw);
					} else {
						res = await this.chat((wSideRating ? 3 : 2), t, aw);
					}
					return res;
				},
				msgSide(msg) {
					if (msg.side == 1) return 1;
					return 0;
				},
				msgLast(t, b) {
					let br = this.turns[t].branches[b];
					if (br.msg >= (this.msgTotal(t, b) - 1)) return 1;
					return 0;
				},
				msgIndex(t, b) {
					return this.turns[t].branches[b].msg;
				},
				msgaStatusSet(t, s) {
					let tmp = this.tbma(t);
					this.msgStatusSet(...tmp, s);
				},
				msgStatusSet(t, b, m, s) {
					let msg = this.msgGet(t, b, m);
					this.msgStatusSetDo(msg, s);
				},
				msgStatusSetDo(m, s) {
					m.status = this.msgStatusId(s);
					this.w(`set status: ${m.status} ${s}`);
					let status = { waiting: 0, loading: 0, done: 0, error: 0, working: 0 };
					if (this.msgWaiting(m)) {
						status.waiting = 1;
					} else if (m.status == 3) {
						status.loading = 1;
					} else if (m.status == 1) {
						status.done = 1;
					} else if (m.status == 4) {
						status.error = 1;
					}
					if (m.status == 0 || m.status == 3 || m.status == 5 || m.status == 6 || m.status == 7 || m.status == null) {
						status.working = 1;
					}

					for (const i in status) {
						m[i] = status[i];
					}
				},
				msgStatusId2W(m) {
					if (m == null) return 'new';
					if (m == 0) return 'waiting';
					if (m == 1) return 'done';
					if (m == 2) return 'cancel';
					if (m == 3) return 'loading';
					if (m == 4) return 'error';
					if (m == 5) return 'embedding prompt';
					if (m == 6) return 'embedding search';
					if (m == 7) return 'templating';
					throw new Error(`unknown status ${m}`);
				},
				msgStatusId(m) {
					if (m === 'new') return null;
					if (m === 'waiting') return 0;
					if (m === 'done') return 1;
					if (m === 'cancel') return 2;
					if (m === 'loading') return 3;
					if (m === 'error') return 4;
					if (m === 'embedding prompt') return 5;
					if (m === 'embedding search') return 6;
					if (m === 'templating') return 7;
					throw new Error(`unknown status ${m}`);
				},
				msgEditable(m) {
					if (m.status == 1 || m.status == 2 || m.status == 4) return true;
					return false;
				},
				msgInited(t, b, m) {
					let msg = this.msgGet(t, b, m);
					//this.w(`msginited: ${t}/${b}/${m}: status=${msg.status}`);
					return msg.status != this.msgStatusId('new');
				},
				msgSideNickUpdate(t, b, m) {
					//as we store non-normalized links, we have to update manually.
					const msg = this.msgGet(t, b, m);
					if (!this.msgSide(msg)) return 0;
					if (this.msgRole(msg) !== 'u') return 0;
					this.w(`it's an unsent user side message, let's update the nick`);
					this.msgNickSet(t, b, m, this.userS("u"));
				},
				msgNickSet(t, b, m, u) {
					const msg = this.msgGet(t, b, m);
					msg.nick = this.nicks[u].n;
					msg.nId = u;
				},
				scroll(id, top) {
					this.w(`scroll to ${id}`);
					let to = top ? "start" : "end";
					try {
						if (!id) {
							if (this.config.chatHeight.v != '' && this.config.chatHeight.v > 0) document.getElementById('chatLogEnd').scrollIntoView({ behavior: 'smooth', block: to, inline: "nearest" });
							document.getElementById('prompt').scrollIntoView({ behavior: 'smooth', block: to, inline: "nearest" });
						} else {
							document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: to, inline: "nearest" });
						}
					} catch (e) {
						this.w(`couldn't find id to scroll to: ${id}`)
					}
				},
				msgRating(i, m, v) {
					if (m.rating == v) {
						m.rating = null;
					} else {
						m.rating = v;
					}
					let brated = 0;
					for (let j of this.msgsa(i)) {
						if (j.rating != null && j.rating !== '') {
							brated = 1;
							break;
						}
					}
					this.brancha(i).rated = brated ? true : false;
					this.w(`branch is rated=${this.brancha(i).rated}`);
				},
				msga(turn) {
					const b = this.brancha(turn);
					return b.msgs[b.msg];
				},
				msgsa(turn) {
					return this.brancha(turn).msgs;
				},
				msgUserAdd(msg, u, id) {
					msg.nicks[u] = true;
					msg.nicksArr = this.msgUserListAll({ nicks: msg.nicks }); //re-sort
					this.w(`delete add user list ${id}`)
					delete this.msgUserListOn[id];
				},
				msgUserDel(msg, u) {
					if (!confirm(`Are you sure you wish to delete character ${this.nicks[u].n} from the access list of this message? If you do that, this character will not see the message anymore.`)) return 0;
					delete msg.nicks[u];
					msg.nicksArr = this.msgUserListAll({ nicks: msg.nicks }); //re-build to remove erased one
				},
				msgUserListAvail(msg, t, g) {
					let users = [];
					for (const u in this.groups[g].u) {
						//this.w(`${this.userVis(t,u)} ${!msg.nicks.hasOwnProperty(u)}`)
						if (this.userVis(t, u) && !msg.nicks.hasOwnProperty(u)) {
							users.push(u);
						}
					}
					//this.w({'available users':users});
					return users.sort((a, b) => (this.nicks[a].n.localeCompare(this.nicks[b].n)));
				},
				msgUserListAllAvail(msg, g) {
					let users = [];
					users.push(...this.msgUserListAvail(msg, "u", g));
					users.push(...this.msgUserListAvail(msg, "a", g));
					//			this.w(`${users}`);
					return users;
				},
				msgUserList(msg, t) {
					let users = [];
					for (const u in msg.nicks) {
						this.w(`checking if ${u} ${t} is visible the msg list`);
						if (this.userVis(t, u) && msg.nicks[u]) users.push(u);
					}
					return users.sort((a, b) => (this.nicks[a].n.localeCompare(this.nicks[b].n)));
				},
				msgUserListAll(msg) {
					let users = [];
					users.push(...this.msgUserList(msg, "u"));
					users.push(...this.msgUserList(msg, "a"));
					this.w(`list all users of the message: ${users}`);
					return users;
				},
				msgC3ToC(m) {
					m.content = this.msgC3To1(m);
				},
				msgC3To1(m) {
					let c = '';
					for (const s in m.content3) {
						if (m.content3[s] != null && m.content3[s].length) c += m.content3[s] + '\n\n';
					}
					return c.trim();
				},
				msgContentAdd(m, trinity, c, owContent) {
					if (!trinity) {
						m.content += c;
						if (owContent) m.content3.a += c;
					} else {
						m.content3[trinity] += c;
						if (owContent) this.msgC3ToC(m);
					}
				},
				msgContentSet(m, trinity, c, owContent) {
					if (!trinity) {
						m.content = c;
						if (owContent) m.content3.a = c;
					} else {
						m.content3[trinity] = c;
						if (owContent) this.msgC3ToC(m);
					}
				},
				msgContent(m, trinity, u) {
					if (!trinity) {
						return m.content;
					}

					//no access to anything else
					if (this.nicks[u].t === 'a' && u != m.nId) return m.content3.a;

					if (trinity === true || trinity == 1) {
						return this.msgC3To1(m);
					} else {
						return m.content3[trinity];
					}
				},

				//chat methods
				async chat(m, turn, aw) {
					if (event != null) event.preventDefault();
					if (this.working || this.workingRag) {
						this.w('can not do chat, working already');
						return;
					}
					this.working = 1;
					this.w(`chat mode: ${m} turn: ${turn}`);
					let prompt = this.prompt.trim();
					let rag = this.config.rag.v;
					const uid = this.userS("u"), aid = this.userS("a");

					if (!turn) {
						turn = this.turn;
						this.w(`turn is not defined, getting current one: ${turn}`);
						const msg = this.msga(turn);
						if (this.msgRole(msg) === 'u') {
							this.w('we are at the user turn, so let us check if it is a side message or not');
							if (!this.msgSide(msg)) {
								this.w("it's not a side message and the current turn belongs to a user.");
								//this.w("it's not a side message and the current turn belongs to a user, can't send two user turns in line");
								//alert("You can not reply to your own message");
								//this.working=0;
								//return;
							} else if (this.turnNotLast(turn)) {
								this.w(`it's not the last turn, let's convert this to a side message request`);
								this.chatUserSide(turn, prompt, uid, aid);
							}
						} else {
							this.w("it's a reply to AI turn, let's see if we need to make it a side message or a first one");
							if (this.turnNotLast(turn)) {
								this.w(`it's not the last turn, let's convert this to a side message request`);
								this.turn = turn = turn + 1;
								this.chatUserSide(turn, prompt, uid, aid);
							}
						}
					}
					let ms = [], final;
					const side = this.msgSide(this.msga(turn));
					this.w(`chat at turn ${turn}`);
					this.w(`reply by user ${uid} (${this.nicks[uid].n})`);
					let tbm = [];

					if (m === 1) {
						this.w('user is sending new msg');
						if (side) {
							this.w(`it's a user side message, turn--`);
							turn--;
						} else {
							this.w("create a next turn/branch");
							this.turnnew(turn, uid, this.group);
						}

						turn++;
						let b = this.brancha(turn);
						//empty message was already created with the branch creation,
						//either at new turn creation or with the parent side message creation.
						b.msgs[b.msg] = this.msgTmpl(uid, prompt, this.group);
						this.msgaStatusSet(turn, 'done');
						this.prompt = '';
						this.turnnew(turn, aid, this.group);
						tbm = this.tbma(turn + 1);
						ms = await this.chatForAi({ turn: turn, uId: uid, aId: aid, sideReplyWRating: 0, msg: this.msgGet(...tbm) });
						turn++;
					} else if (m === 2 || m === 3) {
						this.w('user is asking for a new side message');
						this.prompt = '';
						//we will get the message type according to the current one.
						//if it's user, we will get next user message, if it's ai, we will get ai one.

						if (this.msgRole(this.msga(turn)) === 'u' || turn == 1) {
							this.chatUserSide(turn, null, uid, aid);
							this.working = 0;
							return;
						} else {
							this.msgNew(turn, aid, uid, null, this.group);
							this.branchu(turn);
							tbm = this.tbma(turn);
							this.w(`user is asking for a new ai message, mode=${m}`);
							ms = await this.chatForAi({ turn: turn - 1, uId: uid, aId: aid, sideReplyWRating: (m === 3 ? 1 : 0), msg: this.msgGet(...tbm) });
						}
					}

					if (aw) {
						await this.chatSend(ms);
						this.w('finished waiting for chatsend');
					} else {
						this.chatSend(ms);
						this.w('not waiting for chatsend');
					}

					this.working = 0;
					if (!this.opt.run) this.scroll(null, 0);

					return tbm;
				},
				async chatSend(ms) {
					let m = ms.msg;
					let opt = this.chatOptions();
					opt['stream'] = this.stream;
					opt['raw'] = ms.raw;

					//opt['messages']		=msgs;

					const t = this;
					const rrtp = new RegExp(`${t.rgEsc(t.chatRatingMod(1, ''))}`, 'g');
					const rrtm = new RegExp(`${t.rgEsc(t.chatRatingMod(0, ''))}`, 'g');
					const rn = new RegExp('^\\s*(?:as )?' + t.rgEsc(m.nick) + ':[\\s\\r\\n]*', 'gim');
					const remoji = new RegExp('[\\p{Extended_Pictographic}\\p{Emoji_Modifier_Base}\\p{Emoji_Presentation}]*', 'gum');
					let tmp;

					trt: for (let trt of ms.extra) {

						if (Array.isArray(trt)) {
							if (trt[1] == null) continue trt;
							ms.final.push(trt[1]);
							trt = trt[0];
						} else {
							trt = false;
						}

						const isOpenRouter = this.isOpenRouter();
						const endpoint = {
							chat: {
								url: isOpenRouter ? "/chat/completions" : "/api/chat",
								param: isOpenRouter ? 'messages' : 'messages',
								resp: isOpenRouter ? ['choices', 0, 'delta', 'content'] : ['message', 'content']
							},
							generate: {
								url: isOpenRouter ? "/chat/completions" : "/api/generate",
								param: isOpenRouter ? 'messages' : 'prompt',
								images: 'images',
								resp: isOpenRouter ? ['choices', 0, 'delta', 'content'] : ['response']
							}
						};

						const ep = ms.raw ? 'generate' : 'chat';

						const final = t.chatAiMs2Tmpl(ms);

						// Prepare request body based on API type
						if (isOpenRouter) {
							// OpenRouter uses OpenAI-compatible format
							opt.messages = Array.isArray(final.prompt) ? final.prompt : [];
							opt.model = t.models[t.settings.req.model.v.v].tag;
							delete opt.raw; // OpenRouter doesn't use this
							delete opt.stream; // Will be handled differently
							opt.stream = true;

							// Handle images for OpenRouter (convert to base64 URLs if needed)
							if (final.images.length && opt.messages.length > 0) {
								const lastMessage = opt.messages[opt.messages.length - 1];
								if (lastMessage.role === 'user') {
									if (!lastMessage.content || typeof lastMessage.content === 'string') {
										lastMessage.content = [
											{ type: 'text', text: lastMessage.content || '' }
										];
									}
									for (const img of final.images) {
										lastMessage.content.push({
											type: 'image_url',
											image_url: { url: `data:image/jpeg;base64,${img}` }
										});
									}
								}
							}
						} else {
							// Ollama format
							opt[endpoint[ep].param] = final.prompt;
							if (final.images.length) {
								if (!endpoint[ep].hasOwnProperty('images')) {
									this.w(`Don't know how to use images for endpoint ${ep}!`)
								} else {
									opt[endpoint[ep].images] = final.images;
									for (const im in final.images) {
										//opt[endpoint[ep].param]+=` [img-${im}] `
									}
								}
							}
						}

						t.w({ body: opt });
						t.msgStatusSetDo(m, 'waiting');
						let res = '', buf = '', r = '', bufValue = ''; t.msgContentSet(m, trt, '', true);

						try {
							r = await fetch(t.url() + endpoint[ep].url, {
								"method": "POST",
								"headers": t.getHeaders(),
								"body": JSON.stringify(opt)
							});
							if (!r.ok) throw new Error(r.statusText);
						} catch (err) {
							t.w(`error: ${err}`);
							t.connectionErr = `${err}`; //weird but lol
							t.connection = 0;
							t.cancel = 0;
							this.msgContentSet(m, trt, `${err}`, true);
							t.msgStatusSetDo(m, 'error');
							return 'error';
						};

						const reader = r.body.getReader();
						const decoder = new TextDecoder('utf-8');
						let errorJson = false;

						main: while (true) {
							const { done, value } = await reader.read();
							t.w('dissecting response');

							if (done) {
								t.msgContentAdd(m, trt, buf, true);
								t.w({ 'Stream complete': res });
								//there is a bug when ollama might not send anything for prompt_eval_count
								if (res.hasOwnProperty('eval_count')) m.tr[t.models[t.settings.req.model.v.v].n] += res.eval_count;
								if (res.hasOwnProperty('prompt_eval_count')) m.tp[t.models[t.settings.req.model.v.v].n] += res.prompt_eval_count;
								//t.cancel=0;
								break;
							}

							if (t.cancel) {
								t.w('cancelling');
								errorJson = false;
								t.msgContentAdd(m, trt, buf, true);
								reader.cancel();
								reader.releaseLock();
								break;
							}

							bufValue += decoder.decode(value);

							errorJson = false;
							const splitter = isOpenRouter ? '\n\n' : '\n';
							const parsed = [];
							const chnks = bufValue.split(splitter);
							t.w({ cnks: chnks });
							let offset = 0;

							for (let CH = 0; CH < chnks.length; CH++) { //>
								let ch = chnks[CH];
								if (!ch.length) {
									offset += splitter.length;
									continue;
								}

								// Handle OpenRouter SSE format
								if (isOpenRouter) {
									if (ch.startsWith('data: ')) {
										ch = ch.substring(6);
										if (ch === '[DONE]') {
											continue; // Skip the [DONE] marker
										}
									} else {
										continue; // Skip non-data lines
									}
								}

								try {
									parsed.push(JSON.parse(ch));
									this.w({ bv: bufValue, chl: ch.length, ch: ch });
									bufValue = bufValue.substr(ch.length + splitter.length + offset);
									offset = 0;
									this.w({ bvCutten: bufValue });
									this.w(`parsed a new chunk of ${ch.length} bytes`);
								} catch (error) {
									console.error(error);
									this.w({ error: `error parsing json ${error}, chunk ${CH} let's try to get next part of the data and try again.`, chunk: ch });
									t.w({ bufValLenAtRetry: bufValue.length, bf: bufValue });
									errorJson = error;
									break;
								}
							}
							this.w(`parsed a ${parsed.length} chunks, processing`);
							//bufValue='';
							for (let res of parsed) {
								let rf = res;

								// Navigate through the response structure based on API type
								for (const p of endpoint[ep].resp) {
									if (rf && rf.hasOwnProperty(p)) {
										rf = rf[p];
									} else {
										rf = '';
										break;
									}
								}

								// Handle OpenRouter response format where content might be undefined
								if (isOpenRouter && (rf === undefined || rf === null)) {
									rf = '';
								}

								buf += rf;

								//t.w(`${buf} ${rn}`)
								buf = buf.replace(rrtp, '').replace(rrtm, '').replace(rn, '');
								if (t.config.emojiNo.v) buf = buf.replace(remoji, '');
								m.trm++;
								if (m.status == 0) {
									if (t.config.resClean.v) {
										if (buf.length < t.config.resBufCleanSize.v) {//>
											t.w(`accumulating buffer at start ${buf}`);
											//return reader.read().then(processText);
											continue;
										}
									}
									t.msgStatusSetDo(m, 'loading');
								}
								t.msgContentAdd(m, trt, buf, true);
								if (ms.hasOwnProperty('func') && ms.func != null) {
									ms.func(m.content, ms.d);
								}
								buf = '';
							}
						}

						//t.cancel=0;
						let content = t.msgContent(m, trt, m.nId);
						if (t.config.resClean.v) {
							content = content.trim().replace(rrtp, '').replace(rrtm, '').replace(rn, '');
						}
						if (t.config.emojiNo.v) {
							content = content.replace(remoji, '');
						}
						t.msgContentSet(m, trt, content, true);

						if (errorJson != false) {
							t.w({ 'error': errorJson });
							t.connectionErr = `${errorJson}`; //weird but lol
							t.connection = 0;
							t.msgContentAdd(m, trt, errorJson, true);
							break trt;
						}

						if (trt != false) this.chatFinalPush(ms.final, {
							nId: m.nId,
							nick: ms.nicks.l[m.nId].n,
							content: this.msgContent(m, trt, m.nId),
							rating: '',
							images: [],
						});
						//t.chatAiMsTmpl(content,'assistant',m.nId,m.nick,'',null,content)

						if (t.cancel) break;
					}
					t.w(`chat received`);

					//t.working=0;
					if (t.connection == 0) {
						t.msgStatusSetDo(m, 'error');
					} else if (t.cancel) {
						t.msgStatusSetDo(m, 'cancel');
					} else {
						t.msgStatusSetDo(m, 'done');
					}
					t.cancel = 0;
				},
				chatForAiConfig(h) {
					const cfgParams = ['trinity', 'stories', 'replyWithRating', 'rag', 'instrWithSideRating', 'raw', 'namesAdd', 'aiIsYou', 'otherAiAsUser', 'imgsLastOnly', 'rawLog', 'rawTmpl', 'noAiReplyToSelf', 'rooms', 'trinityReqTh', 'trinityReqA', 'trinityChancesTh', 'noReplyToSelf', 'emptyToSth', 'emptyToTxt'];
					for (const p of cfgParams) {
						if (h.hasOwnProperty(p)) continue;
						h[p] = this.config[p].v;
					}
				},
				storiesMsgVisible(m, aId) {
					if (m.nId != this.nick['s'] && !m.nicks[aId]) return false;
					return true;
				},
				ragDisable(m) {
					this.config.rag.v = false;
					if (!m) return;
					for (const nick in this.nicks) {
						if (!this.nicks[nick].hasOwnProperty('settings')) continue;
						this.nicks[nick].config.rag.v = false;
					}
				},
				chatMsNicks(h) {
					let nicks = { l: {}, ai: h.aId, uid: h.uId };
					for (let n in this.nicks) {
						nicks.l[n] = { n: this.nicks[n].n, id: n, t: this.nicks[n].t };
					}
					return nicks;
				},
				async chatForAi(h) {
					this.chatForAiConfig(h);
					let ms = {}, add = [], sh = this.shuffle();

					this.w(`building list of chat for ai ${h.aId} ${this.nicks[h.aId].n}, up to ${h.turn}`);
					this.w({ data: h });

					let adds = {
						rag: [],
						instr: '',
						nredo: [],
						predo: [],
						wRating: '',
						wSideRating: '',
					};

					if (this.imgs.length) {
						this.w(`The prompt has ${this.imgs.length} images, let's add.`);
						this.msga(h.turn).images = [];
						for (const img of this.imgs) {
							this.msga(h.turn).images.push({ c: img, s: 0 });
						}
						this.imgs = [];
					} else { this.w(`no images in the prompt`) }


					let final = [], ratingUsed = 0;
					for (let i = 1; i <= h.turn; i++) { //>
						let msg = this.msga(i);
						let content = this.msgContent(msg, h.trinity, h.aId).trim();
						if (content === '' && h.emptyToSth) {
							this.w(`Replacing empty msg #${i} from ${this.nicks[msg.nId].n} with ${h.emptyToTxt}`);
							content = h.emptyToTxt;
						}
						if (content === '' && !h.emptyToSth) {
							this.w(`skipping empty msg #${i} from ${this.nicks[msg.nId].n}`);
							continue;
						}
						if (h.stories && !this.storiesMsgVisible(msg, h.aId)) {
							this.w(`Skipping msg #i due to stories`);
							continue;
						}
						let images = (msg.hasOwnProperty('images') && msg.images.length) ? msg.images.map(img => img.c) : [];
						let rating = '';
						if (msg.rating != null && msg.rating !== '' && msg.nId == h.aId) {
							rating = msg.rating;
							if (!ratingUsed) {
								this.w(`found a set rating: ${msg.rating}`)
								ratingUsed++;
							}
						}
						this.chatFinalPush(final, {
							nId: msg.nId,
							nick: msg.nick,
							content: content,
							rating: rating,
							images: images,
						});
					}
					const finalTurn = final.length - 1;

					this.w(`We got ${finalTurn + 1} chat log messages, now let's process additional parts`);

					if (h.replyWithRating) {
						if (ratingUsed) {
							this.w('rating is used');
							adds.wRating = 1;
						} else {
							this.w("rating is enabled but not used, skipping");
						}
					} else { this.w(`Rating is disabled in config`) }

					this.rag[h.aId].last = [];
					this.rag['g'].last = [];
					if (h.rag) {
						this.w("rag is enabled");
						// Since embedding model is hardcoded, skip the model availability check
						this.w(`searching in rag`);
						let ragp = 1;
						if (!/^(\d{1,14})$/.test(this.config.ragPast.v)) {
							this.config.ragPast.v = this.config.ragPast.def;
							alert(`You have a bad configured value for the ${this.config.ragPast.name} parameter, resetted it to: ${this.config.ragPast.v}`);
						}
						ragp = this.config.ragPast.v;
						this.w(`rag past messages to use: ${ragp}`);
						let rags = [];
						if (ragp > 0) {
							for (let i = finalTurn; i >= 0; i--) {
								rags.push(final[i].content);
								ragp--;
								if (ragp == 0) break;
							}
						}
						this.w({ 'rag search content': rags });

						if ((this.rag['g'].t.length + this.rag[h.aId].t.length) == 0) {
							this.w('global and user rags are empty, skipping rag');
						} else if (rags.length == 0) {
							this.w('rag prompt is empty, skipping rag');
						} else {
							this.msgStatusSetDo(h.msg, 'embedding prompt');
							let e = await this.embed(`please find top related content to: """${rags.join("\n")}"""`); //
							this.msgStatusSetDo(h.msg, 'embedding prompt');
							if (!e.length) {
								const errorMsg = this.rag.err ? `Embedding error: ${this.rag.err}` : "Embedding returned empty result";
								this.w(`RAG skip for this message: ${errorMsg}`);
								alert(`Memories (RAG) feature skipped for this message due to embedding error: ${errorMsg}. Check your embedding URL (${this.config.urlEmb.v}) and ensure the embedding model 'nomic-embed-text:latest' is available.`);
								// Don't disable RAG permanently, just skip it for this message
							} else {
								const memb = 'nomic-embed-text:latest'; // Hardcoded embedding model
								let rv = { g: [] }; rv[h.aId] = [];
								let ra = {};
								let min = '';
								if (/^\d{1,14}(:?\.\d{1,14})?$/.test(this.config.ragMinSmlr.v)) {
									min = this.config.ragMinSmlr.v;
								} else if (this.config.ragMinSmlr.v !== '' && this.config.ragMinSmlr.v != null) {
									alert("You have a wrong value for 'Minimum required similarity value', ignoring it");
								}
								this.w(`lowest similarity configured is: ${min}`);

								ra[h.aId] = /^\d{1,14}$/.test(this.config.ragUAmount.v) ? this.config.ragUAmount.v : 2;
								ra['g'] = /^\d{1,14}$/.test(this.config.ragGAmount.v) ? this.config.ragGAmount.v : 2;

								this.msgStatusSetDo(h.msg, 'embedding search');

								for (const r of ['g', h.aId]) {
									if (memb != this.rag[r].modelEmb) {
										this.w(`embedding model has changed from ${this.rag[r].modelEmb} -> ${memb}, let's re-evaluate rag`);
										this.rag[r].v = [];
										await this.ragU(r);
									}
									for (let i = 0; i < this.rag[r].v.length; i++) { //>
										const R = this.rag[r].v[i];
										const cos = this.cosine(R[0], e[0]);
										this.w(`got cos=${cos} for ${e[1]}=${R[1]}`);
										if (min !== '' && cos < min) { //>
											this.w(`Similarity is lower than defined ${cos}<${this.config.ragMinSmlr.v}`); //>
											continue;
										}
										rv[r].push({ i: i, cos: cos });
									}
									this.w({ rv: rv });
									if (rv[r].length) {
										const upto = rv[r].length > ra[r] ? ra[r] : rv[r].length;
										this.w(`rag amount: ${ra[r]}, rag upto: ${upto}`);
										rv[r] = rv[r].sort((a, b) => (a.cos > b.cos ? -1 : 1)).slice(0, upto);
										this.w({ ragtouse: rv[r] });
										if (this.config.ragShuffle.v) {
											this.w('shuffling the rag results as requested in config');
											rv[r] = sh(rv[r], upto);
										} else {
											this.w('shuffling is disabled, using rag as is');
										}
										for (const R of rv[r]) {
											this.rag[r].last.push({
												t: this.rag[r].v[R.i][1], id: R.i,
												cos: R.cos
											});
											adds.rag.push(this.rag[r].v[R.i][1]);
										}
									}
									this.w({ 'rag last of user': r, is: this.rag[r].last });
								}
							}
						}
						this.msgStatusSetDo(h.msg, 'templating');
					} else { this.w(`memories are disabled in config`) }

					if (this.nicks[h.aId].instr.length) {
						this.w(`we have instr text, let's see if we should add it: sideReply=${h.sideReplyWRating}, allow instr with side-rating:${h.instrWithSideRating}`);
						if (
							(h.sideReplyWRating && h.instrWithSideRating)
							|| (!h.sideReplyWRating)
						) {
							this.w(`can use instr`);
							adds.instr = this.nicks[h.aId].instr;
						} else {
							this.w(`instr is not appliable`);
						}
					} else { this.w('instr is empty') }

					if (h.sideReplyWRating) {
						this.w("processing rated sideReply rating");
						let good = [], bad = [];

						for (const m of this.msgsa(h.turn + 1)) {
							if (h.stories && !this.storiesMsgVisible(m, h.aId)) continue;
							if (m.nId != h.aId) continue;
							if (m.rating == 1) { good.push(this.msgContent(m, h.trinity, h.aId)) }
							else if (m.rating == 0) { bad.push(this.msgContent(m, h.trinity, h.aId)) }
						}

						let exQ = this.config.badExForSideReply.v
						if (bad.length && exQ > 0) {
							for (const i of sh(bad, exQ)) {
								adds.nredo.push(i);
							}
						}

						exQ = this.config.goodExForSideReply.v;
						if (good.length && exQ > 0) {
							for (const i of sh(good, exQ)) {
								adds.predo.push(i);
							}
						}
						this.w("finished taking sidereply examples");
					} else { this.w(`not a rated sideReply, skipping sideReply rating`) }

					this.w({ adds: adds });
					this.w('starting templating the adds');

					ms.msg = h.msg;
					ms.finalTurn = finalTurn;
					ms.extra = [];
					ms.sys = this.nicks[h.aId].system ?? '';
					ms.rooms = h.rooms;
					ms.raw = h.raw;
					ms.nicks = this.chatMsNicks(h);
					ms.mods = {
						replyWithRating: h.replyWithRating,
						namesAdd: h.namesAdd,
						aiIsYou: h.aiIsYou,
						otherAiAsUser: h.otherAiAsUser,
						imgsLastOnly: h.imgsLastOnly,
						noReplyToSelf: h.noReplyToSelf,
						emptyToSth: h.emptyToSth,
						emptyToTxt: h.emptyToTxt,
					};

					const logRaw = h.rawLog;
					if (ms.raw) {
						if (logRaw) this.wDo(`Raw mode is enabled`);
						let tmpl = { start: '', user: '', assistant: '', end: '', img: '', singleMsgMode: '' };
						for (const s in tmpl) {
							let rg = new RegExp(`{{${s}}}(.*?){{/${s}}}`, 's');
							let tmp = h.rawTmpl.match(rg);
							if (tmp != null && tmp.length > 1) {
								tmpl[s] = tmp[1];
								if (logRaw) this.wDo(`Found template part ${s}: ${tmpl[s]}`);
							} else {
								alert(`Haven't found a part of raw template: {{${s}}} {{/${s}}}, turning off raw mode for this request.`);
								ms.raw = false;
								if (logRaw) this.wDo(`Have not found template part ${s}, stopping.`);
								break;
							}
						}
						ms.rawTmpl = tmpl;
						if (logRaw) this.wDo({ rawModeTemplate: ms.rawTmpl });
					} else {
						if (logRaw) this.wDo(`Raw mode is disabled`);
					}

					let msgs = { u: [], s: [], f: {} };
					if (adds.rag.length) {
						msgs.u.push(`(in my mind i search for something relevant: """${adds.rag.join('\n')}""")`);
					}
					if (adds.nredo.length) {
						msgs.u.push(
							`in my reply i shall avoid messages like these: ${adds.nredo.map(arr => '"""' + arr + '"""').join(', ')
							}`
						);
						adds.wSideRating = 1;
					}
					if (adds.predo.length) {
						msgs.u.push(`Here are ready reply ideas in my head, i'll improvise keeping their logic, style and mood: ${adds.predo.map(arr => '"""' + arr + '"""').join(", ")}`);
						adds.wSideRating = 1;
					}
					if (adds.instr.length) {
						msgs.u.push(`Main thing on my mind: """${adds.instr}"""`);
					}
					if (adds.wRating == 1) {
						const posr = this.chatRatingMod(1, ''), negr = this.chatRatingMod(0, '');
						msgs.s.push(`Task: Messages with ${negr} are bad, imitate ${posr} messages in style, size, manner. Do not use ${posr} and ${negr} in your own messages.`);
					}
					this.w({ ulen: msgs.u });
					if (finalTurn >= 0) {
						//as we inject last message in these, we need to process it according to the rules
						//we process other messages.
						// but we don't want any mods here apart from name, if it's enabled.
						//i need to move it to chattmpldo now
						let htmp = {}; for (const k in ms) { this.copy(ms, htmp, k) };
						htmp.mods = { namesAdd: h.namesAdd };
						const replyTo = this.chatTmplDo(finalTurn, htmp, final[finalTurn]);

						if (!h.trinity) {
							if (msgs.u.length || msgs.s.length) {
								msgs.s.push(`Now, with above in mind react to """{{replyToText}}""", 1 in-character reaction only`);
							}
						} else {
							let chance = h.trinityChancesTh + '';
							if (!chance.match(/^(?:[01]|0.\d{1,14})$/)) {
								chance = this.config.trinityChancesTh.def;
								alert(`Wrong trinity thoughts chance set: ${h.trinityChancesTh}, reverting to: ${this.config.trinityChancesTh.def}`);
								this.config.trinityChancesTh.v = this.config.trinityChancesTh.def;
							}
							if ((chance * 1) > Math.random()) {
								this.w(`Chances for thinking were high :)`);
								msgs.f.th = h.trinityReqTh;
							} else {
								this.w(`Chances for thinking were low :)`);
							}
							msgs.f.a = h.trinityReqA;
						}
					}
					for (const m of msgs.u) {
						this.chatFinalPush(final, {
							nId: h.aId,
							nick: this.nicks[h.aId].n,
							content: m,
							rating: '',
							images: [],
						});
					}
					for (const m of msgs.s) {
						this.chatFinalPush(final, {
							nId: this.nick['s'],
							nick: this.nicks[this.nick['s']].n,
							content: m,
							rating: '',
							images: [],
						});
					}
					//add.push(this.msgTmpl(this.nick['s'],msgs.s.join("\n"),null));

					this.w(`added adds, now ${final.length} messages`);
					this.w({ final: final });

					if (Object.keys(msgs.f).length) {
						for (let i of ['th', 'a']) { //'e',
							if (!msgs.f.hasOwnProperty(i)) continue;
							this.w(`adding final: ${i} ${msgs.f[i]}`);

							this.chatFinalPush(ms.extra, {
								nId: this.nick['s'],
								nick: this.nicks[this.nick['s']].n,
								content: msgs.f[i],
								rating: '',
								images: [],
							});
							ms.extra[ms.extra.length - 1] = [i, ms.extra[ms.extra.length - 1]];
						}
					} else {
						ms.extra.push(false);
						if (h.noAiReplyToSelf && finalTurn >= 0) {
							//i used to keep the u/ai turn based order, but not anymore
							//yes, it will confuse ai's at times, but this way there is more user control
							//with trinity it's not needed as it states who should reply
							//otherwise instruction says it
							//otherwise model will be confused most likely.
							//so ideally, if the last message with extras is ai's, we need to add this.
							let fl = final.length - 1;
							if (final[fl].nId == h.aId) {
								this.w(`No ai reply to self is enabled, it's not trinity and last msg is the same ai that will reply, let's add last msg to prevent it to reply to self.`);
								this.chatFinalPush(final, {
									nId: this.nick['s'],
									nick: this.nicks[this.nick['s']].n,
									content: 'continue in accordance with your system prompt, do not mention this message.',
									rating: '',
									images: [],
								});
							}
						}
					}

					ms.final = final;

					this.w({ ms: ms });
					return ms;
				},
				chatFinalPush(final, h) {
					let tmp = {
						nId: null,
						nick: null,
						content: null,
						rating: null,
						images: [],
					};
					for (let i in tmp) {
						if (!h.hasOwnProperty(i)) {
							throw new Error(`can't find property ${i} for final msgs array!`);
						}
						tmp[i] = h[i];
					}
					final.push(tmp);
				},
				ucFirst(str) {
					return str ? str[0].toUpperCase() + str.substr(1) : '';
				},
				rawTmplReplace(d, txt) {
					this.w({ rawData: d, txt: txt });
					for (const r in d) {
						const rg = new RegExp('{{' + r + '}}', 'gs');
						txt = txt.replace(rg, d[r]);
					}
					return txt;
				},
				chatAiMs2Tmpl(ms) {
					let final = [], tmp, res = [], d = {}, imgs = [], logRaw = this.config.rawLog.v, fl, ftRaw, ft;

					for (const i in ms.final) {
						//this.copy(ms.final,final,i);
						final.push(this.chatTmplDo(i, ms, ms.final[i]));
					}

					fl = final.length - 1;

					if (ms.hasOwnProperty('mods') && ms.mods.noReplyToSelf && ms.final[ms.finalTurn].nId == ms.nicks.ai) {
						this.w(`Final message belongs to replier and noReplyToSelf set, searching for another reply.`);
						if (logRaw) this.wDo(`Final message belongs to replier and noReplyToSelf set, searching for another reply.`);

						for (let i = ms.finalTurn; i >= 0; i--) {
							if (ms.final[i].nId != ms.nicks.ai) {
								ftRaw = ms.final[i];
								ft = final[i];
							}
						}
						if (ft == undefined) {
							this.w(`No message found to reply to, using empty data`);
							if (logRaw) this.wDo(`No message found to reply to, using empty data`);
							ft = this.chatTmplRow('', '', '', []);
							ftRaw = this.chatTmplRow('', '', '', []);
						}
					} else {
						this.w(`Taking final message from the last turn.`);
						ftRaw = ms.final[ms.finalTurn];
						ft = final[ms.finalTurn];
					}

					d = {
						replierId: ms.nicks.ai,
						replierName: ms.nicks.l[ms.nicks.ai].n,
						replyToUserId: ftRaw.nId,
						replyToName: ft.nick,
						replyToText: ft.content,
						replyToTextRaw: ftRaw.content,
						sys: ms.sys,
						charId: '',
						charName: '',
						msg: '',
						msgRaw: '',
						charIdPrev: '',
						charNamePrev: '',
						msgPrev: '',
						msgRawPrev: '',
						imgIndex: '',
						img: '',
					};

					//process extras like trinity.
					for (let i = ms.finalTurn + 1; i <= fl; i++) { //>
						if (!final[i].content.length) continue;
						final[i].content = this.rawTmplReplace(d, final[i].content);
					}

					this.w({ msgsFinal: final });

					if (ms.raw) {
						if (logRaw) this.wDo(`Raw mode enabled, processing data.`);
						this.w({ nicks: ms.nicks })

						res.push(this.rawTmplReplace(d, ms.rawTmpl.start));
						if (logRaw) this.wDo({ part: 'start', data: d, template: res[res.length - 1] });

						let msgs = [];
						for (const i in final) {
							const fRaw = ms.final[i];
							const f = final[i];
							let txt = '';
							if (ms.rooms) { txt = ms.rawTmpl.singleMsgMode }
							else if (f.role === 'user') { txt = ms.rawTmpl[f.role] }
							else if (f.role === 'assistant') { txt = ms.rawTmpl[f.role] }
							else {
								this.w(`Unknown role: ${f.role}, ignoring line: ${f.content}`);
								if (logRaw) this.wDo(`Unknown role: ${f.role}, ignoring line: ${f.content}`);
								continue;
							}

							if (txt == null || !txt.length) {
								if (logRaw) this.wDo(`Empty template for msg ${i}, skipping.`);
								continue;
							}

							d.charId = fRaw.nId;
							d.charName = f.nick;
							d.msg = f.content;
							d.msgRaw = fRaw.content;
							d.img = '';
							d.imgIndex = '';

							if (i > 0) {
								const fp = final[i - 1];
								const fpRaw = ms.final[i - 1];
								d.charIdPrev = fpRaw.nId;
								d.charNamePrev = fp.nick;
								d.msgPrev = fp.content;
								d.msgRawPrev = fpRaw.content;
							} else {
								d.charIdPrev = '';
								d.charNamePrev = '';
								d.msgPrev = '';
								d.msgRawPrev = '';
							}

							tmp = '';
							if (f.images && f.images.length) {
								let imgTmpl = ms.rawTmpl.img;
								tmp = [];
								for (const img of f.images) {
									imgs.push(img);
									tmp.push(this.rawTmplReplace({ imgIndex: imgs.length - 1 }, imgTmpl));
								}
								tmp = tmp.join(' ');
							}
							d.img = tmp;

							msgs.push(this.rawTmplReplace(d, txt));
							if (logRaw) this.wDo({ turn: i, role: f.role, data: d, template: msgs[msgs.length - 1] });
						}

						if (ms.rooms) {
							d.charId = d.replyToUserId;
							d.charName = d.replyToName;
							d.msg = msgs.join('');
							d.msgRaw = msgs.join('');
							d.img = '';
							d.imgIndex = '';
							d.charIdPrev = '';
							d.charNamePrev = '';
							d.msgPrev = '';
							d.msgRawPrev = '';
							//everything is already replaced but we just put it this way into the single msg template
							res.push(this.rawTmplReplace(d, `${ms.rawTmpl.user}`));
							this.w({ chat: res[res.length - 1], singleMsg: ms.rooms });
							if (logRaw) {
								this.wDo('Single message mode is activated, chat log will be joined into a single message..');
								this.wDo({ chatLog: res[res.length - 1] });
							}
						} else {
							for (const m of msgs) {
								res.push(m);
							}
							this.w({ chat: res, singleMsg: ms.rooms });
							if (logRaw) this.wDo('Single message mode is disabled, building role based template.');
						}

						d.charId = d.replierId;
						d.charName = d.replierName;
						d.msg = '';
						d.msgRaw = '';
						d.img = '';
						d.imgIndex = '';

						if (final.length) {
							const fp = final[fl];
							const fpRaw = ms.final[fl];
							d.charIdPrev = fpRaw.nId;
							d.charNamePrev = fp.nick;
							d.msgPrev = fp.content;
							d.msgRawPrev = fpRaw.content;
						}
						res.push(this.rawTmplReplace(d, ms.rawTmpl.end));
						if (logRaw) this.wDo({ part: 'end', data: d, template: res[res.length - 1] });

						if (logRaw) this.wDo(`Resulting template: ${res.join('')}`);

						return { prompt: res.join(''), images: imgs };
					} else {
						if (logRaw) this.wDo(`Raw mode is disabled, using standard data processing.`);
					}

					if (ms.sys.length) {
						this.chatAiMsPush(res, ms.sys, 'system');
					}

					if (ms.rooms) {
						this.w("room mode, let's concatenate everything");
						imgs = [];
						for (const i of final) {
							if (!i.images || !i.images.length) continue;
							imgs.push(...i.images);
						}
						this.w(`in rooms mode amount of images: ${imgs.length}`);
						this.chatAiMsPush(res, final.map(arr => arr.content).join('\n\n'), 'user', imgs);
					} else {
						this.w("chat mode, let's add everything as messages");
						for (const i of final) {
							this.chatAiMsPush(res, i.content, i.role, i.images);
						}
					}
					return { prompt: res, images: [] };
				},
				chatAiMsPush(ms, c, r, i) {
					ms.push({ content: c, role: r });
					if (i && i.length) ms[ms.length - 1].images = i;
				},
				chatTmplDo(turn, h, f) {
					this.w(h);
					let role = h.nicks.l[f.nId].t === 'a' ? 'assistant' : 'user';
					let nick = f.nick;
					let ct = f.content;
					let images = f.images;

					//this.w({role:role,mod:123,mods:h.mods,asd:`${role},${f.nId},${h.nicks.aid}`,f:f});
					if (h.hasOwnProperty('mods')) {
						if (h.mods.imgsLastOnly) images = this.chatTmplImgsLastOnly(turn, h.finalTurn, images);
						if (h.mods.otherAiAsUser) role = this.chatTmplOtherAiAsUser(role, f.nId, h.nicks.ai);
						if (h.mods.aiIsYou) nick = this.chatTmplAiIsYou(nick, f.nId, h.aid);
						if (h.mods.namesAdd) ct = this.chatTmplNameAdd(ct, nick);
						if (h.mods.replyWithRating) ct = this.chatRatingMod(f.rating, ct);
					}
					return this.chatTmplRow(ct, role, images, nick);
				},
				chatTmplRow(ct, role, images, nick) {
					return {
						content: ct,
						role: role,
						images: images,
						nick: nick,
					};
				},
				chatTmplImgsLastOnly(turn, lastLogTurn, imgs) {
					if (!imgs.length) return imgs;
					this.w(`img filter: ${turn}!=${lastLogTurn}`);
					if (lastLogTurn != turn) return [];
					return imgs;
				},
				chatTmplOtherAiAsUser(role, nId, aid) {
					if (role !== 'assistant' || nId == aid) return role;
					this.w(`overriding role of ${nId}!=${aid} to make it user`);
					return 'user';
				},
				chatTmplAiIsYou(nick, nId, aid) {
					if (nId != aid) return nick;
					return 'You';
				},
				chatTmplNameAdd(ct, n) {
					return `${n}: ${ct}`;
				},
				chatAiMsTmpl(c, r, nId, n, rt, i, cr, uRaw, uRating, uName) {
					let tmp = {
						content: c,
						contentRaw: cr,
						role: r,
						nick: n,
						rating: rt,
						nId: nId,
						useRaw: uRaw,
						useRating: uRating,
						useName: uName,
					};
					if (i != null && i.length) {
						tmp.images = [];
						for (const img of i) {
							tmp.images.push(img.c);
						}
					}
					return tmp;
				},
				chatRatingMod(rt, s) {
					if (!(rt != null && rt !== '' && (rt == 1 || rt == 0))) return s;

					let tmp = '';
					if (rt == 1) {
						tmp = '((+))';
					} else if (rt === 0) {
						tmp = '((-))'
					}
					//this.w(`ratingmod: ${rt} ${s} ${tmp}`);
					return `${tmp}${s}`;
				},
				chatUserSide(turn, c, u, u2) {
					let b = this.brancha(turn);
					this.msgNew(turn, u, u2, (c ?? ''), this.group); //contents needs to be inited
					b.msgs[b.msg]['side'] = 1;
					this.msgaStatusSet(turn, 'waiting');
					this.w(`a new side message at ${turn} for user ${u}, next turn is ${u2}`);
					turn = this.turn = turn - 1;
					this.branchu(turn);
					this.w(`resetting turn to ${this.turn}`);
				},
				chatOptions() {
					const opt = this.chatOpt2hash(0);
					opt['options'] = this.chatOpt2hash(1);
					return opt;
				},
				chatOpt2hash(m) {
					let opt = {};
					const sets = m == 1 ? this.settings.options : this.settings.req;
					for (const i in sets) {
						if (i == 'modelEmb') continue; //dirty hack :)
						this.w(`processing settings param ${i}=${sets[i].v}`);
						if (!(sets[i].v + '').length) continue;
						this.w(`${i}=${sets[i].v}`)
						if (sets[i].t === 'n') {
							opt[i] = sets[i].v * 1;
						} else if (sets[i].t === 'as') {
							opt[i] = [];
							for (const j of sets[i].v) {
								if (j === '') continue;
								opt[i].push(j + '');
							}
						} else if (sets[i].t === 'sel') {
							opt[i] = sets[i].v.l[sets[i].v.v].tag;
						} else {
							opt[i] = sets[i].v + '';
						}
					}
					return opt;
				},
				rgEsc(string) {
					return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
				},

				//connection url stuff
				url() {
					return this.config.url.v;
				},
				isOpenRouter() {
					return this.url().includes('openrouter.ai');
				},
				getHeaders() {
					const headers = {
						"Content-Type": "application/json"
					};
					if (this.isOpenRouter() && this.config.apiKey.v) {
						headers["Authorization"] = `Bearer ${this.config.apiKey.v}`;
						headers["HTTP-Referer"] = window.location.href;
						headers["X-Title"] = "Ollama-Chats";
					}
					return headers;
				},
				async urlTest(url) {
					if (this.working) {
						this.w('working right now, leaving');
						return;
					}

					this.connectionErr = '';
					this.connection = 0;
					this.working = 1;

					this.w(`taking url`);
					if (!url) url = this.url();
					if (!url) {
						this.w(`no good address`);
						this.connectionErr = 'No good url found';
						this.working = 0;
						return;
					}
					this.connectionErr = '';

					const isOpenRouter = url.includes('openrouter.ai');
					const endpoint = isOpenRouter ? "/models" : "/api/tags";
					const headers = isOpenRouter ? this.getHeaders() : {};

					let res = await fetch(url + endpoint, {
						"method": "GET",
						"headers": headers
					}).then(r => {
						if (!r.ok) throw new Error(r.statusText);
						return r;
					}).then(async (r) => {
						this.working = 0;
						this.connectionErr = ''
						this.w(`connection established, running models listing`);
						await this.listDo();
						return 1;
					}).catch((error) => {
						this.connectionErr = error.message;
						console.error(`network error ${error.message}`);
						this.working = 0;
					});
				},
			}
		})

		app.component(
			'css', {
			template: '#tmplCss'
		}).component('nick', {
			template: '#tmplNick',
			props: ['id', 'name'],
		}).component('menun', {
			template: '#tmplMenuN',
			props: ['k', 't'],
			inject: ['config']
		}).component('fields', {
			template: '#tmplField',
			props: ['i', 'n', 'nShow', 'id'],
			methods: {
				loadFile(n) {
					this.$root.loadFile(n);
				}
			},
		}).component('nickadd', {
			template: '#tmplNickAdd',
			props: ['t', 'group', 'nicks', 'groups', 'amountNicks'],
			computed: {
				ut() {
					return (this.t === "u" ? "user" : "ai");
				},
				uListAvail() {
					return this.msgUserListAvail({ nicks: this.groups[this.group].u }, this.t, 0);
				},
			},
			data() {
				return {
					userGroupAddId: null,
					userNickA: '',
				}
			},
			watch: {
				'uListAvail'(v) {
					if (!this.uListAvail.length) return 0;
					this.userGroupAddId = this.uListAvail[0];
				}
			},
			methods: {
				sel(i) {
					this.userGroupAddId = i;
					return false;
				},
				async userAdd() {
					await this.$root.userAdd(this.t, this.userNickA, {});
					this.$root.userGroupAdd(this.group, this.amountNicks.idNext - 1);
					this.userNickA = '';
				},
				userGroupAdd() {
					this.$root.userGroupAdd(this.group, this.userGroupAddId)
					this.userGroupAddId = null;
				},
				msgUserListAvail(msg, t, g) {
					return this.$root.msgUserListAvail(msg, t, g);
				},
				pToggle(id) {
					this.$root.pToggle(id);
				},
			},
		}).component('heardBy', {
			template: '#tmplHeardBy',
			props: ['u', 'nicks', 'groups', 'group', 'config'],
			computed: {
				users() {
					//yes, i don't want to write that idiotic hash to array thing :).
					let arr = [[], []];
					const g = this.groups[this.group].u[this.u];
					for (const i in g) { if (this.nicks[i].t === 'u') arr[0].push(i) }
					for (const i in g) { if (this.nicks[i].t === 'a') arr[1].push(i) }
					return [
						...arr[0].sort((a, b) => (this.nicks[a].n.localeCompare(this.nicks[b].n))),
						...arr[1].sort((a, b) => (this.nicks[a].n.localeCompare(this.nicks[b].n)))
					];
				}
			}
		}).component('talkers', {
			template: '#tmplTalkers',
			props: ['nicks', 't', 'groups', 'group', 'config'],
			methods: {
				userS(t) {
					return this.$root.userS(t);
				},
				userVis(id) {
					return this.$root.userVis(this.t, id);
				},
				groupNext() {
					this.$root.groupNext();
				},
				groupPrev() {
					this.$root.groupPrev();
				},
				userCh() {
					this.$root.userCh(this.t);
				},
				send(e, m, aw, id) {
					if (this.t != 'a') return;
					this.groups[this.group]["sel"][this.t] = id;
					this.$root.send(e, m, aw)
				}
			}
		}).component('userList', {
			template: '#tmplUserList',
			props: ['nicks', 't', 'groups', 'group'],
			methods: {
				userVis(id) {
					return this.$root.userVis(this.t, id);
				},
				userGroupDel(id) {
					this.$root.userGroupDel(this.group, id);
				},
				userDel(id) {
					this.$root.userDel(id);
				},
				userTypeCh(id) {
					this.$root.userTypeCh(id);
				},
			}
		}).component('help', {
			template: '#tmplHelp',
		}).component('opt', {
			template: '#tmplOpt',
			props: ['config', 'settings', 'opt', 'pState', 'branch'],
			data() {
				return {

				}
			},
			methods: {
				optimizeRun() {
					this.$root.optimizeRun();
				},
				optimizeCancel() {
					this.$root.optimizeCancel();
				},
				optChUse(m, k) {
					this.$root.optChUse(m, k);
				},
				pToggle(id, v) {
					this.$root.pToggle(id, v);
				},
				optResSave() {
					this.$root.optResSave();
				}
			}
		}).component('optRes', {
			template: '#tmplOptRes',
			props: ['m', 'i']
		}).component('optResValsLine', {
			template: '#tmplOptResValsLine',
			props: ['m', 'mid', 'vals']
		}).component('optResValsHeader', {
			template: '#tmplOptResValsHeader',
			props: ['m']
		}).component('ragErr', {
			template: '#tmplRagErr',
			props: ['rag']
		}).component('ragStatus', {
			template: '#tmplRagStatus',
			props: ['rag', 'id'],
		}).component('charNewParsedParams', {
			template: '#tmplCharNewParsedParams',
			props: ['char-new'],
			computed: {
				disabled() {
					return (this.charNew.working || this.charNew.stepShow >= 2) ? true : false;
				}
			},
			methods: {
				charNewParamsDel(id) {
					this.$root.charNewParamsDel(id);
				},
				charNewCoreParamCh(r) {
					this.$root.charNewCoreParamCh(r);
				}
			}
		}).component('charNewMemSets', {
			template: '#tmplCharNewMemSets',
			props: ['charNew'],
			methods: {
				memSetsDel(o, id) {
					this.$root.memSetsDel(o, id);
				}
			}
		}).component('charNewMemParsed', {
			template: '#tmplCharNewMemParsed',
			props: ['char-new'],
			methods: {
				memParsedDel(o, id) {
					this.$root.memParsedDel(o, id);
				}
			}
		}).component('charNewSystemEdit', {
			template: '#tmplCharNewSystemEdit',
			props: ['char-new', 'pState', 'id'],
			methods: {
				charNewSystemReset(o, id) {
					this.$root.charNewSystemReset(o, id);
				},
				charNewReqReset(o, id, rid) {
					this.$root.charNewReqReset(o, id, rid);
				},
				pToggleDo(id) {
					this.$root.pToggleDo(id)
				},
				charNewCoreParamCh(r) {
					this.$root.charNewCoreParamCh(r);
				}
			}
		}).component('chatRow', {
			template: '#tmplChatRow',
			props: ['turn', 'branch', 'msg', 'fontSize', 'trinity', 'u', 'ai', 'stories', 'group', 'tokens', 'ctx', 'nicks', 'turnEnd', 'branchMoving'],
			data() {
				return {
				}
			},
			watch: {
			},
			computed: {
				t() {
					return this.$root.turns[this.turn];
				},
				b() {
					return this.t.branches[this.branch];
				},
				msgLast() {
					return this.turn === this.turnEnd;
				},
				msgEditable() {
					return this.$root.msgEditable(this.m);
				},
				m() {
					return this.$root.msga(this.turn);
				},
				msgIndex() {
					return this.$root.msgIndex(this.turn, this.branch);
				},
				divId() {
					return 'msgC' + this.turn;
				},
				uType() {
					const t = this.$root.msgRole(this.m);
					return t;
				},
				nickClass() {
					return this.uType === "u" ? "nicku" : "nickai";
				},
				tabIndex() {
					return 10000 + this.turn * 2;
				},
				waitingTxt() {
					return this.uType === 'u' ? '..input new variant into the prompt, please..' : "..wait for it..";
				},
				msgEmpty() {
					return this.$root.msgEmptyDo(this.m);
				},
				statusClass() {
					if (this.m.error) return 'error';
					return '';
				},
				status() {
					if (this.m.waiting) return 'waiting..';
					if (this.m.loading) return 'generating..';
					if (this.m.error) return 'error..';
					if (this.m.status >= 5) return this.$root.msgStatusId2W(this.m.status) + '..';
					if (this.msgEmpty) return 'empty message';
				},
				msgUserListOn() {
					return this.$root.msgUserListOn[this.msgUserListId];
				},
				msgUserListId() {
					return this.turn + '_' + this.branch + '_' + this.msgIndex;
				},
				usersAvail() {
					return this.$root.msgUserListAllAvail(this.m, this.group)
				},
				tokensShow() {
					if (this.uType !== "a") return false;
					if (!this.tokens) return false;
					if (!this.tokensTotal) return false;
					return true;
				},
				tokensTotal() {
					return this.$root.tokensTotal(this.m, null);
				},
				trinityFields() {
					if (this.trinity) {
						return this.uType == 'a' ? ["th", "a"] : ['a']; //"e"
					}
					return [null];
				},
				msgMore() {
					return this.$root.msgTotal(this.turn, this.branch) - this.msgIndex - 1;
				},
				msgRole() {
					return this.$root.msgRole(this.m);
				},
				branchRated() {
					return this.b.rated
				},
				msgContClass() {
					let tmp = 'msgTextCont';
					return tmp;
				},
				msgDelClass() {
					if (this.m.delShow == 1) { return 'msgDelShow' }
					else if (this.m.delShow == 2) { return 'msgMvShow' }
					return '';
				},
				branchDelClass() {
					if (this.b.delShow == 1) { return 'msgDelShow' }
					else if (this.b.delShow == 2) { return 'msgMvShow' }
					return '';
				},
				chatRowClass() {
					let tmp = "chatRow ";
					tmp += this.msgFilterRow();
					return tmp;
				},
			},
			methods: {
				msgClass(tr) {
					let tmp = 'msgText';
					tmp += ' ' + this.msgFilterTrinity(tr);
					return tmp;
				},
				editNick(e) {
					this.m.nick = e.target.innerText.trim() ?? '';
				},
				edit(e, tr) {
					if (!this.msgEditable) return;
					this.m.edited = 1;
					const txt = e.target.innerText.trim() ?? '';
					this.$root.msgContentSet(this.m, tr, txt, false);
					e.target.innerText = txt;
				},
				msgFilterTrinity(tr) {
					//user messages show only content, they do not show trinity even when it's turned.
					//that's why we filter by usertype
					if (this.uType === 'a' && this.trinity && this.ai != this.m.nId && tr !== 'a') return "filterGray";
					return "";
				},
				content(tr) {
					//user id there is needed only for getting content for building list to send to model,
					//so it could filter things, here we just show all content, 
					//so we just pass id of the owner of the message to bypass the check inside
					const content = this.$root.msgContent(this.m, tr, this.m.nId);
					if (this.m.waiting && content == '') return this.waitingTxt;
					return content;
				},
				usersAvailShow(v) {
					this.$root.msgUserListOn[this.msgUserListId] = v;
				},
				msgUserAdd(uid) {
					this.$root.msgUserAdd(this.m, uid, this.msgUserListId)
				},
				msgUserDel(u) {
					this.$root.msgUserDel(this.m, u);
				},
				tokens(t) {
					this.$root.tokens(this.m, null, t);
				},
				msgRating(v) {
					this.$root.msgRating(this.turn, this.m, v);
				},
				branchMerge() {
					if (!confirm(`Are you sure you wish to delete this message and merge the branch below into this branch? It will move everything below into the place of the deleted message, moving it all up one turn.`)) return;
					const t = this.turn;
					const r = this.$root;
					const bn = r.turns[t + 1].branch;
					r.branchMerge(t + 1, bn, r.msgIndex(t + 1, bn), this.turn, this.branch, this.msgIndex);
				},
				branchDel() {
					if (!confirm(`Are you sure you wish to delete the whole branch? It will delete this message and everything below "growing" from it.`)) return;
					this.$root.branchDel(this.turn, this.branch, this.msgIndex);
				},
				delShow(m) {
					this.m.delShow = m > 0 ? 1 : 0;
					for (let i = this.turn + 1; i <= this.turnEnd; i++) { //>
						this.$root.msga(i).delShow = m;
						this.$root.brancha(i).delShow = m;
					}
				},
				mvShow(m) {
					this.m.delShow = m > 0 ? 1 : 0;
					const v = m == 0 ? 0 : 2;
					for (let i = this.turn + 1; i <= this.turnEnd; i++) { //>
						this.$root.msga(i).delShow = v;
						this.$root.brancha(i).delShow = v;
					}
				},
				msgSide() {
					return this.$root.msgSide(this.m);
				},
				msgFilterRow() {
					if (this.$root.msgFilterDo(this.m)) {
						return "filterGray"
					}
					return '';
				},
				branchMvStart() {
					this.$root.branchMoving = { self: {}, src: [this.turn, this.branch, this.msgIndex] };

					let turn = this.turn + 1, br = { [this.branch]: { [this.msgIndex]: true } };
					this.$root.branchMoving.self[this.$root.tbmId(this.turn, this.branch, this.msgIndex)] = true;
					while (this.$root.turns[turn] != undefined) {
						const tr = this.$root.turns[turn];
						const tree = tr.tree;
						if (tree == undefined) break;

						let br2 = {};
						for (let bp in br) {
							if (!tree.hasOwnProperty(bp)) continue;
							for (let mp in br[bp]) {
								//this.$root.w({bp:bp,mp:mp,turn:turn,tree:tree,tr:tree.hasOwnProperty(bp+''),tr2:tree[bp]});
								if (!tree[bp].hasOwnProperty(mp)) continue;
								let b = tree[bp][mp];
								if (!tr.branches[b].msgs.length) continue;
								this.$root.w(`turn: bp/bm:${bp}/${mp} ${turn} branch: ${b}`);
								br2[b] = {};
								for (let m = 0; m < tr.branches[b].msgs.length; m++) { //>
									const id = this.$root.tbmId(turn, b, m);
									this.$root.branchMoving.self[id] = true;
									br2[b][m] = true;
								}
							}
						}
						br = br2;
						turn++;
					}
				},
				branchMvCancel() {
					this.$root.branchMoving = false;
				},
				branchMvEnd() {
					let d = this.$root.branchMoving.src;
					this.$root.branchMv(d[0], d[1], d[2], this.turn, this.branch);
					this.branchMvCancel();
				},
			}
});

window.ap = app.mount('#app');
