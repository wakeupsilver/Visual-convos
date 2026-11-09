// Dream lexicon: turns spoken words into pictures and feelings.
//
// CONCEPTS maps a word to an emoji. The emoji is the identity of a concept,
// so synonyms ("work", "job", "office") collapse into the same picture and
// can "resonate" when two people say different words for the same thing.
//
// Deliberately object/place/nature heavy: pictures of things, not of people,
// to keep the stereotyping that image systems bring with them out of the dream.

const CONCEPTS = `
dream:💭 dreams:💭 dreamt:💭 dreamed:💭 sleep:😴 asleep:😴 tired:😴 exhausted:🥱 nightmare:👹
idea:💡 ideas:💡 think:💭 thought:💭 remember:🧠 memory:🧠 mind:🧠 brain:🧠 magic:✨ wish:🌠
ocean:🌊 sea:🌊 wave:🌊 waves:🌊 surf:🏄 beach:🏖️ sand:🏖️ shore:🏖️ island:🏝️ lake:🏞️ river:🏞️
boat:⛵ ship:🚢 sail:⛵ sailing:⛵ canoe:🛶 whale:🐋 dolphin:🐬 fish:🐟 shark:🦈 octopus:🐙 shell:🐚 crab:🦀
mountain:🏔️ mountains:🏔️ hike:🥾 hiking:🥾 forest:🌲 tree:🌳 trees:🌳 woods:🌲 camping:🏕️ camp:🏕️
volcano:🌋 desert:🏜️ cactus:🌵 flower:🌸 flowers:🌸 rose:🌹 garden:🌷 leaf:🍃 leaves:🍂 autumn:🍂 fall:🍂
mushroom:🍄 seed:🌱 grow:🌱 growing:🌱 plant:🪴 plants:🪴 sunflower:🌻 grass:🌿 nature:🌿
sun:☀️ sunny:☀️ sunshine:☀️ sunrise:🌅 sunset:🌇 dawn:🌅 morning:🌅 moon:🌙 night:🌙 tonight:🌙
star:⭐ stars:⭐ sky:🌌 galaxy:🌌 universe:🌌 space:🚀 rocket:🚀 planet:🪐 comet:☄️ alien:👽 aliens:👽
rain:🌧️ raining:🌧️ storm:⛈️ stormy:⛈️ thunder:⛈️ lightning:⚡ snow:❄️ winter:❄️ cold:🥶 ice:🧊
wind:🌬️ windy:🌬️ cloud:☁️ clouds:☁️ fog:🌫️ rainbow:🌈 hot:🔥 fire:🔥 summer:🏖️ spring:🌷 weather:🌦️
dog:🐕 dogs:🐕 puppy:🐶 cat:🐈 cats:🐈 kitten:🐱 bird:🐦 birds:🐦 owl:🦉 horse:🐎 cow:🐄 pig:🐖
rabbit:🐇 bunny:🐇 bear:🐻 lion:🦁 tiger:🐅 fox:🦊 wolf:🐺 monkey:🐒 elephant:🐘 giraffe:🦒 snake:🐍
butterfly:🦋 bee:🐝 bees:🐝 spider:🕷️ bug:🐛 frog:🐸 turtle:🐢 dragon:🐉 unicorn:🦄 dinosaur:🦖 chicken:🐔
coffee:☕ tea:🍵 water:💧 wine:🍷 beer:🍺 cocktail:🍸 drink:🥤 drinks:🥤 juice:🧃 milk:🥛
food:🍽️ dinner:🍽️ lunch:🥪 breakfast:🥞 hungry:🍽️ eat:🍽️ eating:🍽️ cook:🍳 cooking:🍳 kitchen:🍳
pizza:🍕 burger:🍔 sandwich:🥪 sandwiches:🥪 bread:🍞 cheese:🧀 egg:🥚 eggs:🥚 pancakes:🥞 taco:🌮 tacos:🌮
sushi:🍣 noodles:🍜 ramen:🍜 pasta:🍝 rice:🍚 soup:🍲 salad:🥗 picnic:🧺 cake:🎂 birthday:🎂 cookie:🍪 cookies:🍪
chocolate:🍫 candy:🍬 ice cream:🍦 icecream:🍦 donut:🍩 apple:🍎 apples:🍎 banana:🍌 strawberry:🍓 strawberries:🍓
orange:🍊 lemon:🍋 grapes:🍇 cherry:🍒 peach:🍑 avocado:🥑 carrot:🥕 corn:🌽 popcorn:🍿 honey:🍯
home:🏠 house:🏠 apartment:🏢 room:🛋️ bed:🛏️ door:🚪 window:🪟 city:🏙️ town:🏘️ village:🏘️ street:🛣️ road:🛣️
castle:🏰 church:⛪ school:🏫 college:🎓 university:🎓 graduate:🎓 hospital:🏥 doctor:🩺 sick:🤒 medicine:💊
office:💼 work:💼 job:💼 working:💼 boss:💼 career:💼 meeting:📅 deadline:⏰ deadlines:⏰ late:⏰ time:⏳ clock:⏰
money:💸 cash:💵 rich:💰 expensive:💸 cheap:🪙 bills:🧾 bill:🧾 rent:🧾 debt:🧾 bank:🏦 pay:💳 paid:💳 buy:🛍️ shopping:🛍️
car:🚗 cars:🚗 drive:🚗 driving:🚗 road trip:🚙 bus:🚌 train:🚆 subway:🚇 plane:✈️ flight:✈️ fly:✈️ flying:🕊️ airport:🛫
bike:🚲 bicycle:🚲 travel:🧳 trip:🧳 vacation:🧳 holiday:🧳 journey:🧭 adventure:🧭 map:🗺️ lost:🧭 world:🌍 earth:🌍
music:🎵 song:🎶 songs:🎶 sing:🎤 singing:🎤 dance:💃 dancing:💃 party:🎉 guitar:🎸 piano:🎹 drum:🥁 drums:🥁 violin:🎻
band:🎸 concert:🎟️ radio:📻 movie:🎬 movies:🎬 film:🎬 tv:📺 television:📺 show:📺 game:🎮 games:🎮 play:🎲
book:📚 books:📚 read:📖 reading:📖 story:📖 write:✍️ writing:✍️ letter:✉️ poem:📜 art:🎨 paint:🎨 painting:🎨 draw:🖍️
photo:📷 camera:📷 picture:🖼️ phone:📱 call:📞 text:💬 message:💬 computer:💻 laptop:💻 internet:🌐 email:📧 robot:🤖
ball:⚽ soccer:⚽ football:🏈 basketball:🏀 baseball:⚾ tennis:🎾 swim:🏊 swimming:🏊 run:🏃 running:🏃 gym:🏋️ yoga:🧘
gift:🎁 present:🎁 balloon:🎈 candle:🕯️ key:🔑 keys:🔑 lock:🔒 door:🚪 clock:⏰ crown:👑 diamond:💎 ring:💍 wedding:💒
love:❤️ loved:❤️ heart:❤️ kiss:💋 hug:🫂 friend:🤝 friends:🤝 together:🤝 family:🏡 baby:🍼 kids:🧸 child:🧸 children:🧸 toy:🧸
mom:🌷 mother:🌷 dad:🌳 father:🌳 grandma:🧶 grandmother:🧶 grandpa:🪑 brother:🤜 sister:🤛
happy:😊 joy:😊 laugh:😂 laughing:😂 funny:😂 smile:😊 cry:😢 crying:😢 sad:😢 tears:😢 angry:😠 mad:😠 scared:😱 afraid:😱
fear:😱 worried:😟 worry:😟 anxious:😟 stress:🌀 stressed:🌀 calm:🍃 peace:🕊️ peaceful:🕊️ quiet:🤫 lonely:🥀 alone:🥀
broken:💔 heartbroken:💔 hurt:🩹 pain:🩹 safe:🛡️ free:🕊️ freedom:🕊️ hope:🌱 future:🔮 past:🕰️ luck:🍀 lucky:🍀
ghost:👻 monster:👾 witch:🧙 wizard:🧙 fairy:🧚 angel:👼 devil:😈 skull:💀 death:💀 dead:💀 heaven:☁️ hell:🔥
war:⚔️ fight:🥊 fighting:🥊 argue:🌩️ argument:🌩️ police:🚓 law:⚖️ news:📰 politics:🏛️ vote:🗳️ government:🏛️
science:🔬 experiment:🧪 math:🧮 lab:🧪 build:🏗️ building:🏗️ fix:🔧 tools:🧰 bridge:🌉 tower:🗼 light:💡 dark:🌑 darkness:🌑
gold:🥇 win:🏆 winning:🏆 lose:🥀 lost:🧭 secret:🤫 mystery:🔮 treasure:🪙 pirate:🏴‍☠️ king:👑 queen:👑 princess:👑
`

const POSITIVE = `
love loved lovely like liked good great amazing awesome wonderful beautiful happy happier happiest joy glad
excited exciting fun funny laugh laughing smile yes yeah perfect best better nice sweet kind cute gorgeous
incredible fantastic brilliant magic magical delightful dream calm peace peaceful free relaxed relax hope
hopeful grateful thankful thanks thank proud safe warm cozy fresh lighter bright shine shining celebrate
win won together friend friends hug kiss adore enjoy enjoyed delicious yummy cool wow brave strong gentle
`

const NEGATIVE = `
hate hated bad awful terrible horrible sad cry crying angry mad annoyed annoying furious tired exhausted
stress stressed stressful worried worry anxious scared afraid fear nightmare hurt pain sick broken lonely
alone lost lose losing worst worse ugly boring bored tight broke debt bills deadline deadlines fight
fighting argue argument wrong never problem problems trouble difficult hard struggle struggling cant
can't won't dark storm stormy cold dead death die dying kill hell damn awful miserable upset disappointed
`

const NEGATORS = `not no never don't dont didn't didnt isn't isnt wasn't wasnt can't cant won't wont aren't`

function wordsOf (s) {
  return s.split(/\s+/).map(w => w.trim()).filter(Boolean)
}

const concepts = {}
for (const pair of wordsOf(CONCEPTS.replace(/ice cream/g, 'ice_cream').replace(/road trip/g, 'road_trip'))) {
  const i = pair.indexOf(':')
  if (i < 1) continue
  concepts[pair.slice(0, i).replace('_', ' ')] = pair.slice(i + 1)
}

window.DreamLexicon = {
  concepts,
  positive: new Set(wordsOf(POSITIVE)),
  negative: new Set(wordsOf(NEGATIVE)),
  negators: new Set(wordsOf(NEGATORS))
}
