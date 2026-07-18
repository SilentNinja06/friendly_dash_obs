/*
Daily Dashboard — an Obsidian plugin.
This is a bundled build. Source: https://github.com/SilentNinja06/friendly_dash_obs
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => DailyDashPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian19 = require("obsidian");

// src/settings.ts
var import_obsidian14 = require("obsidian");

// src/panels/clock.ts
var import_obsidian = require("obsidian");

// src/panels/types.ts
var BasePanel = class {
  constructor() {
    this.cleanups = [];
  }
  async mount(el, ctx) {
    this.el = el;
    this.ctx = ctx;
    await this.setup();
    await this.draw();
  }
  async refresh(reason) {
    var _a;
    if ((_a = this.el) == null ? void 0 : _a.isConnected) await this.draw(reason);
  }
  unmount() {
    for (const c of this.cleanups) {
      try {
        c();
      } catch (e) {
      }
    }
    this.cleanups = [];
  }
  onCleanup(fn) {
    this.cleanups.push(fn);
  }
  /** One-time setup (intervals, event subscriptions). Optional. */
  async setup() {
  }
  /** Re-run the body render from within the panel (after a local change). */
  rerender() {
    void this.draw("manual");
  }
  async draw(reason) {
    this.el.empty();
    await this.renderBody(reason);
  }
  setInterval(fn, ms) {
    const id = window.setInterval(fn, ms);
    this.onCleanup(() => window.clearInterval(id));
  }
  /** Wire a text input/textarea so the whole dashboard stops refreshing while
   * it is focused (no jumpy re-render under the cursor), resuming on blur. */
  bindTextFocus(el) {
    el.addEventListener("focus", () => {
      this.ctx.runtime.textFocused = true;
    });
    el.addEventListener("blur", () => {
      this.ctx.runtime.textFocused = false;
    });
  }
};
function placard(el, title) {
  const head = el.createDiv({ cls: "dash-placard" });
  head.createSpan({ cls: "dash-placard-title", text: title });
  return head;
}

// src/panels/clock.ts
var ClockPanel = class extends BasePanel {
  constructor() {
    super(...arguments);
    this.id = "clock";
    this.title = "Clock";
  }
  async setup() {
    this.setInterval(() => this.tick(), 1e3);
  }
  renderBody() {
    placard(this.el, "Clock");
    const wrap = this.el.createDiv({ cls: "dash-clock" });
    this.timeEl = wrap.createDiv({ cls: "dash-clock-time" });
    this.dateEl = wrap.createDiv({ cls: "dash-clock-date" });
    this.tick();
  }
  tick() {
    const now = (0, import_obsidian.moment)();
    const format = this.ctx.settings().clock24h ? "H:mm" : "h:mm A";
    if (this.timeEl) this.timeEl.setText(now.format(format));
    if (this.dateEl) this.dateEl.setText(now.format("dddd, MMMM D, YYYY"));
  }
};

// src/core/verse.ts
var EPOCH_YEAR = 2026;
var EPOCH_MONTH = 1;
function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}
function occurrences(chapter, y, m) {
  let n = 0;
  for (let Y = EPOCH_YEAR; Y <= y; Y++) {
    const last = Y === y ? m : 12;
    for (let M = Y === EPOCH_YEAR ? EPOCH_MONTH : 1; M <= last; M++) {
      if (daysInMonth(Y, M) >= chapter) n++;
    }
  }
  return n;
}
function verseFor(y, m, d, verseCounts2) {
  const chapter = d;
  const count = verseCounts2[chapter - 1];
  if (!count || count < 1) {
    return { chapter, verse: 1 };
  }
  const k = occurrences(chapter, y, m);
  const verse = (k - 1) % count + 1;
  return { chapter, verse };
}
function localYMD(date = /* @__PURE__ */ new Date()) {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}
function verseForDate(date, verseCounts2) {
  const { y, m, d } = localYMD(date);
  return verseFor(y, m, d, verseCounts2);
}

// data/proverbs-kjv.json
var proverbs_kjv_default = { translation: "KJV", translationName: "King James Version", book: "Proverbs", license: "Public domain (US). Sourced from github.com/aruljohn/Bible-kjv.", chapters: [{ chapter: 1, verses: ["The proverbs of Solomon the son of David, king of Israel;", "To know wisdom and instruction; to perceive the words of understanding;", "To receive the instruction of wisdom, justice, and judgment, and equity;", "To give subtilty to the simple, to the young man knowledge and discretion.", "A wise man will hear, and will increase learning; and a man of understanding shall attain unto wise counsels:", "To understand a proverb, and the interpretation; the words of the wise, and their dark sayings.", "The fear of the LORD is the beginning of knowledge: but fools despise wisdom and instruction.", "My son, hear the instruction of thy father, and forsake not the law of thy mother:", "For they shall be an ornament of grace unto thy head, and chains about thy neck.", "My son, if sinners entice thee, consent thou not.", "If they say, Come with us, let us lay wait for blood, let us lurk privily for the innocent without cause:", "Let us swallow them up alive as the grave; and whole, as those that go down into the pit:", "We shall find all precious substance, we shall fill our houses with spoil:", "Cast in thy lot among us; let us all have one purse:", "My son, walk not thou in the way with them; refrain thy foot from their path:", "For their feet run to evil, and make haste to shed blood.", "Surely in vain the net is spread in the sight of any bird.", "And they lay wait for their own blood; they lurk privily for their own lives.", "So are the ways of every one that is greedy of gain; which taketh away the life of the owners thereof.", "Wisdom crieth without; she uttereth her voice in the streets:", "She crieth in the chief place of concourse, in the openings of the gates: in the city she uttereth her words, saying,", "How long, ye simple ones, will ye love simplicity? and the scorners delight in their scorning, and fools hate knowledge?", "Turn you at my reproof: behold, I will pour out my spirit unto you, I will make known my words unto you.", "Because I have called, and ye refused; I have stretched out my hand, and no man regarded;", "But ye have set at nought all my counsel, and would none of my reproof:", "I also will laugh at your calamity; I will mock when your fear cometh;", "When your fear cometh as desolation, and your destruction cometh as a whirlwind; when distress and anguish cometh upon you.", "Then shall they call upon me, but I will not answer; they shall seek me early, but they shall not find me:", "For that they hated knowledge, and did not choose the fear of the LORD:", "They would none of my counsel: they despised all my reproof.", "Therefore shall they eat of the fruit of their own way, and be filled with their own devices.", "For the turning away of the simple shall slay them, and the prosperity of fools shall destroy them.", "But whoso hearkeneth unto me shall dwell safely, and shall be quiet from fear of evil."] }, { chapter: 2, verses: ["My son, if thou wilt receive my words, and hide my commandments with thee;", "So that thou incline thine ear unto wisdom, and apply thine heart to understanding;", "Yea, if thou criest after knowledge, and liftest up thy voice for understanding;", "If thou seekest her as silver, and searchest for her as for hid treasures;", "Then shalt thou understand the fear of the LORD, and find the knowledge of God.", "For the LORD giveth wisdom: out of his mouth cometh knowledge and understanding.", "He layeth up sound wisdom for the righteous: he is a buckler to them that walk uprightly.", "He keepeth the paths of judgment, and preserveth the way of his saints.", "Then shalt thou understand righteousness, and judgment, and equity; yea, every good path.", "When wisdom entereth into thine heart, and knowledge is pleasant unto thy soul;", "Discretion shall preserve thee, understanding shall keep thee:", "To deliver thee from the way of the evil man, from the man that speaketh froward things;", "Who leave the paths of uprightness, to walk in the ways of darkness;", "Who rejoice to do evil, and delight in the frowardness of the wicked;", "Whose ways are crooked, and they froward in their paths:", "To deliver thee from the strange woman, even from the stranger which flattereth with her words;", "Which forsaketh the guide of her youth, and forgetteth the covenant of her God.", "For her house inclineth unto death, and her paths unto the dead.", "None that go unto her return again, neither take they hold of the paths of life.", "That thou mayest walk in the way of good men, and keep the paths of the righteous.", "For the upright shall dwell in the land, and the perfect shall remain in it.", "But the wicked shall be cut off from the earth, and the transgressors shall be rooted out of it."] }, { chapter: 3, verses: ["My son, forget not my law; but let thine heart keep my commandments:", "For length of days, and long life, and peace, shall they add to thee.", "Let not mercy and truth forsake thee: bind them about thy neck; write them upon the table of thine heart:", "So shalt thou find favour and good understanding in the sight of God and man.", "Trust in the LORD with all thine heart; and lean not unto thine own understanding.", "In all thy ways acknowledge him, and he shall direct thy paths.", "Be not wise in thine own eyes: fear the LORD, and depart from evil.", "It shall be health to thy navel, and marrow to thy bones.", "Honour the LORD with thy substance, and with the firstfruits of all thine increase:", "So shall thy barns be filled with plenty, and thy presses shall burst out with new wine.", "My son, despise not the chastening of the LORD; neither be weary of his correction:", "For whom the LORD loveth he correcteth; even as a father the son in whom he delighteth.", "Happy is the man that findeth wisdom, and the man that getteth understanding.", "For the merchandise of it is better than the merchandise of silver, and the gain thereof than fine gold.", "She is more precious than rubies: and all the things thou canst desire are not to be compared unto her.", "Length of days is in her right hand; and in her left hand riches and honour.", "Her ways are ways of pleasantness, and all her paths are peace.", "She is a tree of life to them that lay hold upon her: and happy is every one that retaineth her.", "The LORD by wisdom hath founded the earth; by understanding hath he established the heavens.", "By his knowledge the depths are broken up, and the clouds drop down the dew.", "My son, let not them depart from thine eyes: keep sound wisdom and discretion:", "So shall they be life unto thy soul, and grace to thy neck.", "Then shalt thou walk in thy way safely, and thy foot shall not stumble.", "When thou liest down, thou shalt not be afraid: yea, thou shalt lie down, and thy sleep shall be sweet.", "Be not afraid of sudden fear, neither of the desolation of the wicked, when it cometh.", "For the LORD shall be thy confidence, and shall keep thy foot from being taken.", "Withhold not good from them to whom it is due, when it is in the power of thine hand to do it.", "Say not unto thy neighbour, Go, and come again, and to morrow I will give; when thou hast it by thee.", "Devise not evil against thy neighbour, seeing he dwelleth securely by thee.", "Strive not with a man without cause, if he have done thee no harm.", "Envy thou not the oppressor, and choose none of his ways.", "For the froward is abomination to the LORD: but his secret is with the righteous.", "The curse of the LORD is in the house of the wicked: but he blesseth the habitation of the just.", "Surely he scorneth the scorners: but he giveth grace unto the lowly.", "The wise shall inherit glory: but shame shall be the promotion of fools."] }, { chapter: 4, verses: ["Hear, ye children, the instruction of a father, and attend to know understanding.", "For I give you good doctrine, forsake ye not my law.", "For I was my father\u2019s son, tender and only beloved in the sight of my mother.", "He taught me also, and said unto me, Let thine heart retain my words: keep my commandments, and live.", "Get wisdom, get understanding: forget it not; neither decline from the words of my mouth.", "Forsake her not, and she shall preserve thee: love her, and she shall keep thee.", "Wisdom is the principal thing; therefore get wisdom: and with all thy getting get understanding.", "Exalt her, and she shall promote thee: she shall bring thee to honour, when thou dost embrace her.", "She shall give to thine head an ornament of grace: a crown of glory shall she deliver to thee.", "Hear, O my son, and receive my sayings; and the years of thy life shall be many.", "I have taught thee in the way of wisdom; I have led thee in right paths.", "When thou goest, thy steps shall not be straitened; and when thou runnest, thou shalt not stumble.", "Take fast hold of instruction; let her not go: keep her; for she is thy life.", "Enter not into the path of the wicked, and go not in the way of evil men.", "Avoid it, pass not by it, turn from it, and pass away.", "For they sleep not, except they have done mischief; and their sleep is taken away, unless they cause some to fall.", "For they eat the bread of wickedness, and drink the wine of violence.", "But the path of the just is as the shining light, that shineth more and more unto the perfect day.", "The way of the wicked is as darkness: they know not at what they stumble.", "My son, attend to my words; incline thine ear unto my sayings.", "Let them not depart from thine eyes; keep them in the midst of thine heart.", "For they are life unto those that find them, and health to all their flesh.", "Keep thy heart with all diligence; for out of it are the issues of life.", "Put away from thee a froward mouth, and perverse lips put far from thee.", "Let thine eyes look right on, and let thine eyelids look straight before thee.", "Ponder the path of thy feet, and let all thy ways be established.", "Turn not to the right hand nor to the left: remove thy foot from evil."] }, { chapter: 5, verses: ["My son, attend unto my wisdom, and bow thine ear to my understanding:", "That thou mayest regard discretion, and that thy lips may keep knowledge.", "For the lips of a strange woman drop as an honeycomb, and her mouth is smoother than oil:", "But her end is bitter as wormwood, sharp as a two-edged sword.", "Her feet go down to death; her steps take hold on hell.", "Lest thou shouldest ponder the path of life, her ways are moveable, that thou canst not know them.", "Hear me now therefore, O ye children, and depart not from the words of my mouth.", "Remove thy way far from her, and come not nigh the door of her house:", "Lest thou give thine honour unto others, and thy years unto the cruel:", "Lest strangers be filled with thy wealth; and thy labours be in the house of a stranger;", "And thou mourn at the last, when thy flesh and thy body are consumed,", "And say, How have I hated instruction, and my heart despised reproof;", "And have not obeyed the voice of my teachers, nor inclined mine ear to them that instructed me!", "I was almost in all evil in the midst of the congregation and assembly.", "Drink waters out of thine own cistern, and running waters out of thine own well.", "Let thy fountains be dispersed abroad, and rivers of waters in the streets.", "Let them be only thine own, and not strangers\u2019 with thee.", "Let thy fountain be blessed: and rejoice with the wife of thy youth.", "Let her be as the loving hind and pleasant roe; let her breasts satisfy thee at all times; and be thou ravished always with her love.", "And why wilt thou, my son, be ravished with a strange woman, and embrace the bosom of a stranger?", "For the ways of man are before the eyes of the LORD, and he pondereth all his goings.", "His own iniquities shall take the wicked himself, and he shall be holden with the cords of his sins.", "He shall die without instruction; and in the greatness of his folly he shall go astray."] }, { chapter: 6, verses: ["My son, if thou be surety for thy friend, if thou hast stricken thy hand with a stranger,", "Thou art snared with the words of thy mouth, thou art taken with the words of thy mouth.", "Do this now, my son, and deliver thyself, when thou art come into the hand of thy friend; go, humble thyself, and make sure thy friend.", "Give not sleep to thine eyes, nor slumber to thine eyelids.", "Deliver thyself as a roe from the hand of the hunter, and as a bird from the hand of the fowler.", "Go to the ant, thou sluggard; consider her ways, and be wise:", "Which having no guide, overseer, or ruler,", "Provideth her meat in the summer, and gathereth her food in the harvest.", "How long wilt thou sleep, O sluggard? when wilt thou arise out of thy sleep?", "Yet a little sleep, a little slumber, a little folding of the hands to sleep:", "So shall thy poverty come as one that travelleth, and thy want as an armed man.", "A naughty person, a wicked man, walketh with a froward mouth.", "He winketh with his eyes, he speaketh with his feet, he teacheth with his fingers;", "Frowardness is in his heart, he deviseth mischief continually; he soweth discord.", "Therefore shall his calamity come suddenly; suddenly shall he be broken without remedy.", "These six things doth the LORD hate: yea, seven are an abomination unto him:", "A proud look, a lying tongue, and hands that shed innocent blood,", "An heart that deviseth wicked imaginations, feet that be swift in running to mischief,", "A false witness that speaketh lies, and he that soweth discord among brethren.", "My son, keep thy father\u2019s commandment, and forsake not the law of thy mother:", "Bind them continually upon thine heart, and tie them about thy neck.", "When thou goest, it shall lead thee; when thou sleepest, it shall keep thee; and when thou awakest, it shall talk with thee.", "For the commandment is a lamp; and the law is light; and reproofs of instruction are the way of life:", "To keep thee from the evil woman, from the flattery of the tongue of a strange woman.", "Lust not after her beauty in thine heart; neither let her take thee with her eyelids.", "For by means of a whorish woman a man is brought to a piece of bread: and the adulteress will hunt for the precious life.", "Can a man take fire in his bosom, and his clothes not be burned?", "Can one go upon hot coals, and his feet not be burned?", "So he that goeth in to his neighbour\u2019s wife; whosoever toucheth her shall not be innocent.", "Men do not despise a thief, if he steal to satisfy his soul when he is hungry;", "But if he be found, he shall restore sevenfold; he shall give all the substance of his house.", "But whoso committeth adultery with a woman lacketh understanding: he that doeth it destroyeth his own soul.", "A wound and dishonour shall he get; and his reproach shall not be wiped away.", "For jealousy is the rage of a man: therefore he will not spare in the day of vengeance.", "He will not regard any ransom; neither will he rest content, though thou givest many gifts."] }, { chapter: 7, verses: ["My son, keep my words, and lay up my commandments with thee.", "Keep my commandments, and live; and my law as the apple of thine eye.", "Bind them upon thy fingers, write them upon the table of thine heart.", "Say unto wisdom, Thou art my sister; and call understanding thy kinswoman:", "That they may keep thee from the strange woman, from the stranger which flattereth with her words.", "For at the window of my house I looked through my casement,", "And beheld among the simple ones, I discerned among the youths, a young man void of understanding,", "Passing through the street near her corner; and he went the way to her house,", "In the twilight, in the evening, in the black and dark night:", "And, behold, there met him a woman with the attire of an harlot, and subtil of heart.", "(She is loud and stubborn; her feet abide not in her house:", "Now is she without, now in the streets, and lieth in wait at every corner.)", "So she caught him, and kissed him, and with an impudent face said unto him,", "I have peace offerings with me; this day have I payed my vows.", "Therefore came I forth to meet thee, diligently to seek thy face, and I have found thee.", "I have decked my bed with coverings of tapestry, with carved works, with fine linen of Egypt.", "I have perfumed my bed with myrrh, aloes, and cinnamon.", "Come, let us take our fill of love until the morning: let us solace ourselves with loves.", "For the goodman is not at home, he is gone a long journey:", "He hath taken a bag of money with him, and will come home at the day appointed.", "With her much fair speech she caused him to yield, with the flattering of her lips she forced him.", "He goeth after her straightway, as an ox goeth to the slaughter, or as a fool to the correction of the stocks;", "Till a dart strike through his liver; as a bird hasteth to the snare, and knoweth not that it is for his life.", "Hearken unto me now therefore, O ye children, and attend to the words of my mouth.", "Let not thine heart decline to her ways, go not astray in her paths.", "For she hath cast down many wounded: yea, many strong men have been slain by her.", "Her house is the way to hell, going down to the chambers of death."] }, { chapter: 8, verses: ["Doth not wisdom cry? and understanding put forth her voice?", "She standeth in the top of high places, by the way in the places of the paths.", "She crieth at the gates, at the entry of the city, at the coming in at the doors.", "Unto you, O men, I call; and my voice is to the sons of man.", "O ye simple, understand wisdom: and, ye fools, be ye of an understanding heart.", "Hear; for I will speak of excellent things; and the opening of my lips shall be right things.", "For my mouth shall speak truth; and wickedness is an abomination to my lips.", "All the words of my mouth are in righteousness; there is nothing froward or perverse in them.", "They are all plain to him that understandeth, and right to them that find knowledge.", "Receive my instruction, and not silver; and knowledge rather than choice gold.", "For wisdom is better than rubies; and all the things that may be desired are not to be compared to it.", "I wisdom dwell with prudence, and find out knowledge of witty inventions.", "The fear of the LORD is to hate evil: pride, and arrogancy, and the evil way, and the froward mouth, do I hate.", "Counsel is mine, and sound wisdom: I am understanding; I have strength.", "By me kings reign, and princes decree justice.", "By me princes rule, and nobles, even all the judges of the earth.", "I love them that love me; and those that seek me early shall find me.", "Riches and honour are with me; yea, durable riches and righteousness.", "My fruit is better than gold, yea, than fine gold; and my revenue than choice silver.", "I lead in the way of righteousness, in the midst of the paths of judgment:", "That I may cause those that love me to inherit substance; and I will fill their treasures.", "The LORD possessed me in the beginning of his way, before his works of old.", "I was set up from everlasting, from the beginning, or ever the earth was.", "When there were no depths, I was brought forth; when there were no fountains abounding with water.", "Before the mountains were settled, before the hills was I brought forth:", "While as yet he had not made the earth, nor the fields, nor the highest part of the dust of the world.", "When he prepared the heavens, I was there: when he set a compass upon the face of the depth:", "When he established the clouds above: when he strengthened the fountains of the deep:", "When he gave to the sea his decree, that the waters should not pass his commandment: when he appointed the foundations of the earth:", "Then I was by him, as one brought up with him: and I was daily his delight, rejoicing always before him;", "Rejoicing in the habitable part of his earth; and my delights were with the sons of men.", "Now therefore hearken unto me, O ye children: for blessed are they that keep my ways.", "Hear instruction, and be wise, and refuse it not.", "Blessed is the man that heareth me, watching daily at my gates, waiting at the posts of my doors.", "For whoso findeth me findeth life, and shall obtain favour of the LORD.", "But he that sinneth against me wrongeth his own soul: all they that hate me love death."] }, { chapter: 9, verses: ["Wisdom hath builded her house, she hath hewn out her seven pillars:", "She hath killed her beasts; she hath mingled her wine; she hath also furnished her table.", "She hath sent forth her maidens: she crieth upon the highest places of the city,", "Whoso is simple, let him turn in hither: as for him that wanteth understanding, she saith to him,", "Come, eat of my bread, and drink of the wine which I have mingled.", "Forsake the foolish, and live; and go in the way of understanding.", "He that reproveth a scorner getteth to himself shame: and he that rebuketh a wicked man getteth himself a blot.", "Reprove not a scorner, lest he hate thee: rebuke a wise man, and he will love thee.", "Give instruction to a wise man, and he will be yet wiser: teach a just man, and he will increase in learning.", "The fear of the LORD is the beginning of wisdom: and the knowledge of the holy is understanding.", "For by me thy days shall be multiplied, and the years of thy life shall be increased.", "If thou be wise, thou shalt be wise for thyself: but if thou scornest, thou alone shalt bear it.", "A foolish woman is clamorous: she is simple, and knoweth nothing.", "For she sitteth at the door of her house, on a seat in the high places of the city,", "To call passengers who go right on their ways:", "Whoso is simple, let him turn in hither: and as for him that wanteth understanding, she saith to him,", "Stolen waters are sweet, and bread eaten in secret is pleasant.", "But he knoweth not that the dead are there; and that her guests are in the depths of hell."] }, { chapter: 10, verses: ["The proverbs of Solomon. A wise son maketh a glad father: but a foolish son is the heaviness of his mother.", "Treasures of wickedness profit nothing: but righteousness delivereth from death.", "The LORD will not suffer the soul of the righteous to famish: but he casteth away the substance of the wicked.", "He becometh poor that dealeth with a slack hand: but the hand of the diligent maketh rich.", "He that gathereth in summer is a wise son: but he that sleepeth in harvest is a son that causeth shame.", "Blessings are upon the head of the just: but violence covereth the mouth of the wicked.", "The memory of the just is blessed: but the name of the wicked shall rot.", "The wise in heart will receive commandments: but a prating fool shall fall.", "He that walketh uprightly walketh surely: but he that perverteth his ways shall be known.", "He that winketh with the eye causeth sorrow: but a prating fool shall fall.", "The mouth of a righteous man is a well of life: but violence covereth the mouth of the wicked.", "Hatred stirreth up strifes: but love covereth all sins.", "In the lips of him that hath understanding wisdom is found: but a rod is for the back of him that is void of understanding.", "Wise men lay up knowledge: but the mouth of the foolish is near destruction.", "The rich man\u2019s wealth is his strong city: the destruction of the poor is their poverty.", "The labour of the righteous tendeth to life: the fruit of the wicked to sin.", "He is in the way of life that keepeth instruction: but he that refuseth reproof erreth.", "He that hideth hatred with lying lips, and he that uttereth a slander, is a fool.", "In the multitude of words there wanteth not sin: but he that refraineth his lips is wise.", "The tongue of the just is as choice silver: the heart of the wicked is little worth.", "The lips of the righteous feed many: but fools die for want of wisdom.", "The blessing of the LORD, it maketh rich, and he addeth no sorrow with it.", "It is as sport to a fool to do mischief: but a man of understanding hath wisdom.", "The fear of the wicked, it shall come upon him: but the desire of the righteous shall be granted.", "As the whirlwind passeth, so is the wicked no more: but the righteous is an everlasting foundation.", "As vinegar to the teeth, and as smoke to the eyes, so is the sluggard to them that send him.", "The fear of the LORD prolongeth days: but the years of the wicked shall be shortened.", "The hope of the righteous shall be gladness: but the expectation of the wicked shall perish.", "The way of the LORD is strength to the upright: but destruction shall be to the workers of iniquity.", "The righteous shall never be removed: but the wicked shall not inhabit the earth.", "The mouth of the just bringeth forth wisdom: but the froward tongue shall be cut out.", "The lips of the righteous know what is acceptable: but the mouth of the wicked speaketh frowardness."] }, { chapter: 11, verses: ["A false balance is abomination to the LORD: but a just weight is his delight.", "When pride cometh, then cometh shame: but with the lowly is wisdom.", "The integrity of the upright shall guide them: but the perverseness of transgressors shall destroy them.", "Riches profit not in the day of wrath: but righteousness delivereth from death.", "The righteousness of the perfect shall direct his way: but the wicked shall fall by his own wickedness.", "The righteousness of the upright shall deliver them: but transgressors shall be taken in their own naughtiness.", "When a wicked man dieth, his expectation shall perish: and the hope of unjust men perisheth.", "The righteous is delivered out of trouble, and the wicked cometh in his stead.", "An hypocrite with his mouth destroyeth his neighbour: but through knowledge shall the just be delivered.", "When it goeth well with the righteous, the city rejoiceth: and when the wicked perish, there is shouting.", "By the blessing of the upright the city is exalted: but it is overthrown by the mouth of the wicked.", "He that is void of wisdom despiseth his neighbour: but a man of understanding holdeth his peace.", "A talebearer revealeth secrets: but he that is of a faithful spirit concealeth the matter.", "Where no counsel is, the people fall: but in the multitude of counsellors there is safety.", "He that is surety for a stranger shall smart for it: and he that hateth suretiship is sure.", "A gracious woman retaineth honour: and strong men retain riches.", "The merciful man doeth good to his own soul: but he that is cruel troubleth his own flesh.", "The wicked worketh a deceitful work: but to him that soweth righteousness shall be a sure reward.", "As righteousness tendeth to life: so he that pursueth evil pursueth it to his own death.", "They that are of a froward heart are abomination to the LORD: but such as are upright in their way are his delight.", "Though hand join in hand, the wicked shall not be unpunished: but the seed of the righteous shall be delivered.", "As a jewel of gold in a swine\u2019s snout, so is a fair woman which is without discretion.", "The desire of the righteous is only good: but the expectation of the wicked is wrath.", "There is that scattereth, and yet increaseth; and there is that withholdeth more than is meet, but it tendeth to poverty.", "The liberal soul shall be made fat: and he that watereth shall be watered also himself.", "He that withholdeth corn, the people shall curse him: but blessing shall be upon the head of him that selleth it.", "He that diligently seeketh good procureth favour: but he that seeketh mischief, it shall come unto him.", "He that trusteth in his riches shall fall; but the righteous shall flourish as a branch.", "He that troubleth his own house shall inherit the wind: and the fool shall be servant to the wise of heart.", "The fruit of the righteous is a tree of life; and he that winneth souls is wise.", "Behold, the righteous shall be recompensed in the earth: much more the wicked and the sinner."] }, { chapter: 12, verses: ["Whoso loveth instruction loveth knowledge: but he that hateth reproof is brutish.", "A good man obtaineth favour of the LORD: but a man of wicked devices will he condemn.", "A man shall not be established by wickedness: but the root of the righteous shall not be moved.", "A virtuous woman is a crown to her husband: but she that maketh ashamed is as rottenness in his bones.", "The thoughts of the righteous are right: but the counsels of the wicked are deceit.", "The words of the wicked are to lie in wait for blood: but the mouth of the upright shall deliver them.", "The wicked are overthrown, and are not: but the house of the righteous shall stand.", "A man shall be commended according to his wisdom: but he that is of a perverse heart shall be despised.", "He that is despised, and hath a servant, is better than he that honoureth himself, and lacketh bread.", "A righteous man regardeth the life of his beast: but the tender mercies of the wicked are cruel.", "He that tilleth his land shall be satisfied with bread: but he that followeth vain persons is void of understanding.", "The wicked desireth the net of evil men: but the root of the righteous yieldeth fruit.", "The wicked is snared by the transgression of his lips: but the just shall come out of trouble.", "A man shall be satisfied with good by the fruit of his mouth: and the recompence of a man\u2019s hands shall be rendered unto him.", "The way of a fool is right in his own eyes: but he that hearkeneth unto counsel is wise.", "A fool\u2019s wrath is presently known: but a prudent man covereth shame.", "He that speaketh truth sheweth forth righteousness: but a false witness deceit.", "There is that speaketh like the piercings of a sword: but the tongue of the wise is health.", "The lip of truth shall be established for ever: but a lying tongue is but for a moment.", "Deceit is in the heart of them that imagine evil: but to the counsellors of peace is joy.", "There shall no evil happen to the just: but the wicked shall be filled with mischief.", "Lying lips are abomination to the LORD: but they that deal truly are his delight.", "A prudent man concealeth knowledge: but the heart of fools proclaimeth foolishness.", "The hand of the diligent shall bear rule: but the slothful shall be under tribute.", "Heaviness in the heart of man maketh it stoop: but a good word maketh it glad.", "The righteous is more excellent than his neighbour: but the way of the wicked seduceth them.", "The slothful man roasteth not that which he took in hunting: but the substance of a diligent man is precious.", "In the way of righteousness is life: and in the pathway thereof there is no death."] }, { chapter: 13, verses: ["A wise son heareth his father\u2019s instruction: but a scorner heareth not rebuke.", "A man shall eat good by the fruit of his mouth: but the soul of the transgressors shall eat violence.", "He that keepeth his mouth keepeth his life: but he that openeth wide his lips shall have destruction.", "The soul of the sluggard desireth, and hath nothing: but the soul of the diligent shall be made fat.", "A righteous man hateth lying: but a wicked man is loathsome, and cometh to shame.", "Righteousness keepeth him that is upright in the way: but wickedness overthroweth the sinner.", "There is that maketh himself rich, yet hath nothing: there is that maketh himself poor, yet hath great riches.", "The ransom of a man\u2019s life are his riches: but the poor heareth not rebuke.", "The light of the righteous rejoiceth: but the lamp of the wicked shall be put out.", "Only by pride cometh contention: but with the well advised is wisdom.", "Wealth gotten by vanity shall be diminished: but he that gathereth by labour shall increase.", "Hope deferred maketh the heart sick: but when the desire cometh, it is a tree of life.", "Whoso despiseth the word shall be destroyed: but he that feareth the commandment shall be rewarded.", "The law of the wise is a fountain of life, to depart from the snares of death.", "Good understanding giveth favour: but the way of transgressors is hard.", "Every prudent man dealeth with knowledge: but a fool layeth open his folly.", "A wicked messenger falleth into mischief: but a faithful ambassador is health.", "Poverty and shame shall be to him that refuseth instruction: but he that regardeth reproof shall be honoured.", "The desire accomplished is sweet to the soul: but it is abomination to fools to depart from evil.", "He that walketh with wise men shall be wise: but a companion of fools shall be destroyed.", "Evil pursueth sinners: but to the righteous good shall be repayed.", "A good man leaveth an inheritance to his children\u2019s children: and the wealth of the sinner is laid up for the just.", "Much food is in the tillage of the poor: but there is that is destroyed for want of judgment.", "He that spareth his rod hateth his son: but he that loveth him chasteneth him betimes.", "The righteous eateth to the satisfying of his soul: but the belly of the wicked shall want."] }, { chapter: 14, verses: ["Every wise woman buildeth her house: but the foolish plucketh it down with her hands.", "He that walketh in his uprightness feareth the LORD: but he that is perverse in his ways despiseth him.", "In the mouth of the foolish is a rod of pride: but the lips of the wise shall preserve them.", "Where no oxen are, the crib is clean: but much increase is by the strength of the ox.", "A faithful witness will not lie: but a false witness will utter lies.", "A scorner seeketh wisdom, and findeth it not: but knowledge is easy unto him that understandeth.", "Go from the presence of a foolish man, when thou perceivest not in him the lips of knowledge.", "The wisdom of the prudent is to understand his way: but the folly of fools is deceit.", "Fools make a mock at sin: but among the righteous there is favour.", "The heart knoweth his own bitterness; and a stranger doth not intermeddle with his joy.", "The house of the wicked shall be overthrown: but the tabernacle of the upright shall flourish.", "There is a way which seemeth right unto a man, but the end thereof are the ways of death.", "Even in laughter the heart is sorrowful; and the end of that mirth is heaviness.", "The backslider in heart shall be filled with his own ways: and a good man shall be satisfied from himself.", "The simple believeth every word: but the prudent man looketh well to his going.", "A wise man feareth, and departeth from evil: but the fool rageth, and is confident.", "He that is soon angry dealeth foolishly: and a man of wicked devices is hated.", "The simple inherit folly: but the prudent are crowned with knowledge.", "The evil bow before the good; and the wicked at the gates of the righteous.", "The poor is hated even of his own neighbour: but the rich hath many friends.", "He that despiseth his neighbour sinneth: but he that hath mercy on the poor, happy is he.", "Do they not err that devise evil? but mercy and truth shall be to them that devise good.", "In all labour there is profit: but the talk of the lips tendeth only to penury.", "The crown of the wise is their riches: but the foolishness of fools is folly.", "A true witness delivereth souls: but a deceitful witness speaketh lies.", "In the fear of the LORD is strong confidence: and his children shall have a place of refuge.", "The fear of the LORD is a fountain of life, to depart from the snares of death.", "In the multitude of people is the king\u2019s honour: but in the want of people is the destruction of the prince.", "He that is slow to wrath is of great understanding: but he that is hasty of spirit exalteth folly.", "A sound heart is the life of the flesh: but envy the rottenness of the bones.", "He that oppresseth the poor reproacheth his Maker: but he that honoureth him hath mercy on the poor.", "The wicked is driven away in his wickedness: but the righteous hath hope in his death.", "Wisdom resteth in the heart of him that hath understanding: but that which is in the midst of fools is made known.", "Righteousness exalteth a nation: but sin is a reproach to any people.", "The king\u2019s favour is toward a wise servant: but his wrath is against him that causeth shame."] }, { chapter: 15, verses: ["A soft answer turneth away wrath: but grievous words stir up anger.", "The tongue of the wise useth knowledge aright: but the mouth of fools poureth out foolishness.", "The eyes of the LORD are in every place, beholding the evil and the good.", "A wholesome tongue is a tree of life: but perverseness therein is a breach in the spirit.", "A fool despiseth his father\u2019s instruction: but he that regardeth reproof is prudent.", "In the house of the righteous is much treasure: but in the revenues of the wicked is trouble.", "The lips of the wise disperse knowledge: but the heart of the foolish doeth not so.", "The sacrifice of the wicked is an abomination to the LORD: but the prayer of the upright is his delight.", "The way of the wicked is an abomination unto the LORD: but he loveth him that followeth after righteousness.", "Correction is grievous unto him that forsaketh the way: and he that hateth reproof shall die.", "Hell and destruction are before the LORD: how much more then the hearts of the children of men?", "A scorner loveth not one that reproveth him: neither will he go unto the wise.", "A merry heart maketh a cheerful countenance: but by sorrow of the heart the spirit is broken.", "The heart of him that hath understanding seeketh knowledge: but the mouth of fools feedeth on foolishness.", "All the days of the afflicted are evil: but he that is of a merry heart hath a continual feast.", "Better is little with the fear of the LORD than great treasure and trouble therewith.", "Better is a dinner of herbs where love is, than a stalled ox and hatred therewith.", "A wrathful man stirreth up strife: but he that is slow to anger appeaseth strife.", "The way of the slothful man is as an hedge of thorns: but the way of the righteous is made plain.", "A wise son maketh a glad father: but a foolish man despiseth his mother.", "Folly is joy to him that is destitute of wisdom: but a man of understanding walketh uprightly.", "Without counsel purposes are disappointed: but in the multitude of counsellors they are established.", "A man hath joy by the answer of his mouth: and a word spoken in due season, how good is it!", "The way of life is above to the wise, that he may depart from hell beneath.", "The LORD will destroy the house of the proud: but he will establish the border of the widow.", "The thoughts of the wicked are an abomination to the LORD: but the words of the pure are pleasant words.", "He that is greedy of gain troubleth his own house; but he that hateth gifts shall live.", "The heart of the righteous studieth to answer: but the mouth of the wicked poureth out evil things.", "The LORD is far from the wicked: but he heareth the prayer of the righteous.", "The light of the eyes rejoiceth the heart: and a good report maketh the bones fat.", "The ear that heareth the reproof of life abideth among the wise.", "He that refuseth instruction despiseth his own soul: but he that heareth reproof getteth understanding.", "The fear of the LORD is the instruction of wisdom; and before honour is humility."] }, { chapter: 16, verses: ["The preparations of the heart in man, and the answer of the tongue, is from the LORD.", "All the ways of a man are clean in his own eyes; but the LORD weigheth the spirits.", "Commit thy works unto the LORD, and thy thoughts shall be established.", "The LORD hath made all things for himself: yea, even the wicked for the day of evil.", "Every one that is proud in heart is an abomination to the LORD: though hand join in hand, he shall not be unpunished.", "By mercy and truth iniquity is purged: and by the fear of the LORD men depart from evil.", "When a man\u2019s ways please the LORD, he maketh even his enemies to be at peace with him.", "Better is a little with righteousness than great revenues without right.", "A man\u2019s heart deviseth his way: but the LORD directeth his steps.", "A divine sentence is in the lips of the king: his mouth transgresseth not in judgment.", "A just weight and balance are the LORD\u2019s: all the weights of the bag are his work.", "It is an abomination to kings to commit wickedness: for the throne is established by righteousness.", "Righteous lips are the delight of kings; and they love him that speaketh right.", "The wrath of a king is as messengers of death: but a wise man will pacify it.", "In the light of the king\u2019s countenance is life; and his favour is as a cloud of the latter rain.", "How much better is it to get wisdom than gold! and to get understanding rather to be chosen than silver!", "The highway of the upright is to depart from evil: he that keepeth his way preserveth his soul.", "Pride goeth before destruction, and an haughty spirit before a fall.", "Better it is to be of an humble spirit with the lowly, than to divide the spoil with the proud.", "He that handleth a matter wisely shall find good: and whoso trusteth in the LORD, happy is he.", "The wise in heart shall be called prudent: and the sweetness of the lips increaseth learning.", "Understanding is a wellspring of life unto him that hath it: but the instruction of fools is folly.", "The heart of the wise teacheth his mouth, and addeth learning to his lips.", "Pleasant words are as an honeycomb, sweet to the soul, and health to the bones.", "There is a way that seemeth right unto a man, but the end thereof are the ways of death.", "He that laboureth laboureth for himself; for his mouth craveth it of him.", "An ungodly man diggeth up evil: and in his lips there is as a burning fire.", "A froward man soweth strife: and a whisperer separateth chief friends.", "A violent man enticeth his neighbour, and leadeth him into the way that is not good.", "He shutteth his eyes to devise froward things: moving his lips he bringeth evil to pass.", "The hoary head is a crown of glory, if it be found in the way of righteousness.", "He that is slow to anger is better than the mighty; and he that ruleth his spirit than he that taketh a city.", "The lot is cast into the lap; but the whole disposing thereof is of the LORD."] }, { chapter: 17, verses: ["Better is a dry morsel, and quietness therewith, than an house full of sacrifices with strife.", "A wise servant shall have rule over a son that causeth shame, and shall have part of the inheritance among the brethren.", "The fining pot is for silver, and the furnace for gold: but the LORD trieth the hearts.", "A wicked doer giveth heed to false lips; and a liar giveth ear to a naughty tongue.", "Whoso mocketh the poor reproacheth his Maker: and he that is glad at calamities shall not be unpunished.", "Children\u2019s children are the crown of old men; and the glory of children are their fathers.", "Excellent speech becometh not a fool: much less do lying lips a prince.", "A gift is as a precious stone in the eyes of him that hath it: whithersoever it turneth, it prospereth.", "He that covereth a transgression seeketh love; but he that repeateth a matter separateth very friends.", "A reproof entereth more into a wise man than an hundred stripes into a fool.", "An evil man seeketh only rebellion: therefore a cruel messenger shall be sent against him.", "Let a bear robbed of her whelps meet a man, rather than a fool in his folly.", "Whoso rewardeth evil for good, evil shall not depart from his house.", "The beginning of strife is as when one letteth out water: therefore leave off contention, before it be meddled with.", "He that justifieth the wicked, and he that condemneth the just, even they both are abomination to the LORD.", "Wherefore is there a price in the hand of a fool to get wisdom, seeing he hath no heart to it?", "A friend loveth at all times, and a brother is born for adversity.", "A man void of understanding striketh hands, and becometh surety in the presence of his friend.", "He loveth transgression that loveth strife: and he that exalteth his gate seeketh destruction.", "He that hath a froward heart findeth no good: and he that hath a perverse tongue falleth into mischief.", "He that begetteth a fool doeth it to his sorrow: and the father of a fool hath no joy.", "A merry heart doeth good like a medicine: but a broken spirit drieth the bones.", "A wicked man taketh a gift out of the bosom to pervert the ways of judgment.", "Wisdom is before him that hath understanding; but the eyes of a fool are in the ends of the earth.", "A foolish son is a grief to his father, and bitterness to her that bare him.", "Also to punish the just is not good, nor to strike princes for equity.", "He that hath knowledge spareth his words: and a man of understanding is of an excellent spirit.", "Even a fool, when he holdeth his peace, is counted wise: and he that shutteth his lips is esteemed a man of understanding."] }, { chapter: 18, verses: ["Through desire a man, having separated himself, seeketh and intermeddleth with all wisdom.", "A fool hath no delight in understanding, but that his heart may discover itself.", "When the wicked cometh, then cometh also contempt, and with ignominy reproach.", "The words of a man\u2019s mouth are as deep waters, and the wellspring of wisdom as a flowing brook.", "It is not good to accept the person of the wicked, to overthrow the righteous in judgment.", "A fool\u2019s lips enter into contention, and his mouth calleth for strokes.", "A fool\u2019s mouth is his destruction, and his lips are the snare of his soul.", "The words of a talebearer are as wounds, and they go down into the innermost parts of the belly.", "He also that is slothful in his work is brother to him that is a great waster.", "The name of the LORD is a strong tower: the righteous runneth into it, and is safe.", "The rich man\u2019s wealth is his strong city, and as an high wall in his own conceit.", "Before destruction the heart of man is haughty, and before honour is humility.", "He that answereth a matter before he heareth it, it is folly and shame unto him.", "The spirit of a man will sustain his infirmity; but a wounded spirit who can bear?", "The heart of the prudent getteth knowledge; and the ear of the wise seeketh knowledge.", "A man\u2019s gift maketh room for him, and bringeth him before great men.", "He that is first in his own cause seemeth just; but his neighbour cometh and searcheth him.", "The lot causeth contentions to cease, and parteth between the mighty.", "A brother offended is harder to be won than a strong city: and their contentions are like the bars of a castle.", "A man\u2019s belly shall be satisfied with the fruit of his mouth; and with the increase of his lips shall he be filled.", "Death and life are in the power of the tongue: and they that love it shall eat the fruit thereof.", "Whoso findeth a wife findeth a good thing, and obtaineth favour of the LORD.", "The poor useth intreaties; but the rich answereth roughly.", "A man that hath friends must shew himself friendly: and there is a friend that sticketh closer than a brother."] }, { chapter: 19, verses: ["Better is the poor that walketh in his integrity, than he that is perverse in his lips, and is a fool.", "Also, that the soul be without knowledge, it is not good; and he that hasteth with his feet sinneth.", "The foolishness of man perverteth his way: and his heart fretteth against the LORD.", "Wealth maketh many friends; but the poor is separated from his neighbour.", "A false witness shall not be unpunished, and he that speaketh lies shall not escape.", "Many will intreat the favour of the prince: and every man is a friend to him that giveth gifts.", "All the brethren of the poor do hate him: how much more do his friends go far from him? he pursueth them with words, yet they are wanting to him.", "He that getteth wisdom loveth his own soul: he that keepeth understanding shall find good.", "A false witness shall not be unpunished, and he that speaketh lies shall perish.", "Delight is not seemly for a fool; much less for a servant to have rule over princes.", "The discretion of a man deferreth his anger; and it is his glory to pass over a transgression.", "The king\u2019s wrath is as the roaring of a lion; but his favour is as dew upon the grass.", "A foolish son is the calamity of his father: and the contentions of a wife are a continual dropping.", "House and riches are the inheritance of fathers: and a prudent wife is from the LORD.", "Slothfulness casteth into a deep sleep; and an idle soul shall suffer hunger.", "He that keepeth the commandment keepeth his own soul; but he that despiseth his ways shall die.", "He that hath pity upon the poor lendeth unto the LORD; and that which he hath given will he pay him again.", "Chasten thy son while there is hope, and let not thy soul spare for his crying.", "A man of great wrath shall suffer punishment: for if thou deliver him, yet thou must do it again.", "Hear counsel, and receive instruction, that thou mayest be wise in thy latter end.", "There are many devices in a man\u2019s heart; nevertheless the counsel of the LORD, that shall stand.", "The desire of a man is his kindness: and a poor man is better than a liar.", "The fear of the LORD tendeth to life: and he that hath it shall abide satisfied; he shall not be visited with evil.", "A slothful man hideth his hand in his bosom, and will not so much as bring it to his mouth again.", "Smite a scorner, and the simple will beware: and reprove one that hath understanding, and he will understand knowledge.", "He that wasteth his father, and chaseth away his mother, is a son that causeth shame, and bringeth reproach.", "Cease, my son, to hear the instruction that causeth to err from the words of knowledge.", "An ungodly witness scorneth judgment: and the mouth of the wicked devoureth iniquity.", "Judgments are prepared for scorners, and stripes for the back of fools."] }, { chapter: 20, verses: ["Wine is a mocker, strong drink is raging: and whosoever is deceived thereby is not wise.", "The fear of a king is as the roaring of a lion: whoso provoketh him to anger sinneth against his own soul.", "It is an honour for a man to cease from strife: but every fool will be meddling.", "The sluggard will not plow by reason of the cold; therefore shall he beg in harvest, and have nothing.", "Counsel in the heart of man is like deep water; but a man of understanding will draw it out.", "Most men will proclaim every one his own goodness: but a faithful man who can find?", "The just man walketh in his integrity: his children are blessed after him.", "A king that sitteth in the throne of judgment scattereth away all evil with his eyes.", "Who can say, I have made my heart clean, I am pure from my sin?", "Divers weights, and divers measures, both of them are alike abomination to the LORD.", "Even a child is known by his doings, whether his work be pure, and whether it be right.", "The hearing ear, and the seeing eye, the LORD hath made even both of them.", "Love not sleep, lest thou come to poverty; open thine eyes, and thou shalt be satisfied with bread.", "It is naught, it is naught, saith the buyer: but when he is gone his way, then he boasteth.", "There is gold, and a multitude of rubies: but the lips of knowledge are a precious jewel.", "Take his garment that is surety for a stranger: and take a pledge of him for a strange woman.", "Bread of deceit is sweet to a man; but afterwards his mouth shall be filled with gravel.", "Every purpose is established by counsel: and with good advice make war.", "He that goeth about as a talebearer revealeth secrets: therefore meddle not with him that flattereth with his lips.", "Whoso curseth his father or his mother, his lamp shall be put out in obscure darkness.", "An inheritance may be gotten hastily at the beginning; but the end thereof shall not be blessed.", "Say not thou, I will recompense evil; but wait on the LORD, and he shall save thee.", "Divers weights are an abomination unto the LORD; and a false balance is not good.", "Man\u2019s goings are of the LORD; how can a man then understand his own way?", "It is a snare to the man who devoureth that which is holy, and after vows to make enquiry.", "A wise king scattereth the wicked, and bringeth the wheel over them.", "The spirit of man is the candle of the LORD, searching all the inward parts of the belly.", "Mercy and truth preserve the king: and his throne is upholden by mercy.", "The glory of young men is their strength: and the beauty of old men is the grey head.", "The blueness of a wound cleanseth away evil: so do stripes the inward parts of the belly."] }, { chapter: 21, verses: ["The king\u2019s heart is in the hand of the LORD, as the rivers of water: he turneth it whithersoever he will.", "Every way of a man is right in his own eyes: but the LORD pondereth the hearts.", "To do justice and judgment is more acceptable to the LORD than sacrifice.", "An high look, and a proud heart, and the plowing of the wicked, is sin.", "The thoughts of the diligent tend only to plenteousness; but of every one that is hasty only to want.", "The getting of treasures by a lying tongue is a vanity tossed to and fro of them that seek death.", "The robbery of the wicked shall destroy them; because they refuse to do judgment.", "The way of man is froward and strange: but as for the pure, his work is right.", "It is better to dwell in a corner of the housetop, than with a brawling woman in a wide house.", "The soul of the wicked desireth evil: his neighbour findeth no favour in his eyes.", "When the scorner is punished, the simple is made wise: and when the wise is instructed, he receiveth knowledge.", "The righteous man wisely considereth the house of the wicked: but God overthroweth the wicked for their wickedness.", "Whoso stoppeth his ears at the cry of the poor, he also shall cry himself, but shall not be heard.", "A gift in secret pacifieth anger: and a reward in the bosom strong wrath.", "It is joy to the just to do judgment: but destruction shall be to the workers of iniquity.", "The man that wandereth out of the way of understanding shall remain in the congregation of the dead.", "He that loveth pleasure shall be a poor man: he that loveth wine and oil shall not be rich.", "The wicked shall be a ransom for the righteous, and the transgressor for the upright.", "It is better to dwell in the wilderness, than with a contentious and an angry woman.", "There is treasure to be desired and oil in the dwelling of the wise; but a foolish man spendeth it up.", "He that followeth after righteousness and mercy findeth life, righteousness, and honour.", "A wise man scaleth the city of the mighty, and casteth down the strength of the confidence thereof.", "Whoso keepeth his mouth and his tongue keepeth his soul from troubles.", "Proud and haughty scorner is his name, who dealeth in proud wrath.", "The desire of the slothful killeth him; for his hands refuse to labour.", "He coveteth greedily all the day long: but the righteous giveth and spareth not.", "The sacrifice of the wicked is abomination: how much more, when he bringeth it with a wicked mind?", "A false witness shall perish: but the man that heareth speaketh constantly.", "A wicked man hardeneth his face: but as for the upright, he directeth his way.", "There is no wisdom nor understanding nor counsel against the LORD.", "The horse is prepared against the day of battle: but safety is of the LORD."] }, { chapter: 22, verses: ["A GOOD name is rather to be chosen than great riches, and loving favour rather than silver and gold.", "The rich and poor meet together: the LORD is the maker of them all.", "A prudent man foreseeth the evil, and hideth himself: but the simple pass on, and are punished.", "By humility and the fear of the LORD are riches, and honour, and life.", "Thorns and snares are in the way of the froward: he that doth keep his soul shall be far from them.", "Train up a child in the way he should go: and when he is old, he will not depart from it.", "The rich ruleth over the poor, and the borrower is servant to the lender.", "He that soweth iniquity shall reap vanity: and the rod of his anger shall fail.", "He that hath a bountiful eye shall be blessed; for he giveth of his bread to the poor.", "Cast out the scorner, and contention shall go out; yea, strife and reproach shall cease.", "He that loveth pureness of heart, for the grace of his lips the king shall be his friend.", "The eyes of the LORD preserve knowledge, and he overthroweth the words of the transgressor.", "The slothful man saith, There is a lion without, I shall be slain in the streets.", "The mouth of strange women is a deep pit: he that is abhorred of the LORD shall fall therein.", "Foolishness is bound in the heart of a child; but the rod of correction shall drive it far from him.", "He that oppresseth the poor to increase his riches, and he that giveth to the rich, shall surely come to want.", "Bow down thine ear, and hear the words of the wise, and apply thine heart unto my knowledge.", "For it is a pleasant thing if thou keep them within thee; they shall withal be fitted in thy lips.", "That thy trust may be in the LORD, I have made known to thee this day, even to thee.", "Have not I written to thee excellent things in counsels and knowledge,", "That I might make thee know the certainty of the words of truth; that thou mightest answer the words of truth to them that send unto thee?", "Rob not the poor, because he is poor: neither oppress the afflicted in the gate:", "For the LORD will plead their cause, and spoil the soul of those that spoiled them.", "Make no friendship with an angry man; and with a furious man thou shalt not go:", "Lest thou learn his ways, and get a snare to thy soul.", "Be not thou one of them that strike hands, or of them that are sureties for debts.", "If thou hast nothing to pay, why should he take away thy bed from under thee?", "Remove not the ancient landmark, which thy fathers have set.", "Seest thou a man diligent in his business? he shall stand before kings; he shall not stand before mean men."] }, { chapter: 23, verses: ["When thou sittest to eat with a ruler, consider diligently what is before thee:", "And put a knife to thy throat, if thou be a man given to appetite.", "Be not desirous of his dainties: for they are deceitful meat.", "Labour not to be rich: cease from thine own wisdom.", "Wilt thou set thine eyes upon that which is not? for riches certainly make themselves wings; they fly away as an eagle toward heaven.", "Eat thou not the bread of him that hath an evil eye, neither desire thou his dainty meats:", "For as he thinketh in his heart, so is he: Eat and drink, saith he to thee; but his heart is not with thee.", "The morsel which thou hast eaten shalt thou vomit up, and lose thy sweet words.", "Speak not in the ears of a fool: for he will despise the wisdom of thy words.", "Remove not the old landmark; and enter not into the fields of the fatherless:", "For their redeemer is mighty; he shall plead their cause with thee.", "Apply thine heart unto instruction, and thine ears to the words of knowledge.", "Withhold not correction from the child: for if thou beatest him with the rod, he shall not die.", "Thou shalt beat him with the rod, and shalt deliver his soul from hell.", "My son, if thine heart be wise, my heart shall rejoice, even mine.", "Yea, my reins shall rejoice, when thy lips speak right things.", "Let not thine heart envy sinners: but be thou in the fear of the LORD all the day long.", "For surely there is an end; and thine expectation shall not be cut off.", "Hear thou, my son, and be wise, and guide thine heart in the way.", "Be not among winebibbers; among riotous eaters of flesh:", "For the drunkard and the glutton shall come to poverty: and drowsiness shall clothe a man with rags.", "Hearken unto thy father that begat thee, and despise not thy mother when she is old.", "Buy the truth, and sell it not; also wisdom, and instruction, and understanding.", "The father of the righteous shall greatly rejoice: and he that begetteth a wise child shall have joy of him.", "Thy father and thy mother shall be glad, and she that bare thee shall rejoice.", "My son, give me thine heart, and let thine eyes observe my ways.", "For a whore is a deep ditch; and a strange woman is a narrow pit.", "She also lieth in wait as for a prey, and increaseth the transgressors among men.", "Who hath woe? who hath sorrow? who hath contentions? who hath babbling? who hath wounds without cause? who hath redness of eyes?", "They that tarry long at the wine; they that go to seek mixed wine.", "Look not thou upon the wine when it is red, when it giveth his colour in the cup, when it moveth itself aright.", "At the last it biteth like a serpent, and stingeth like an adder.", "Thine eyes shall behold strange women, and thine heart shall utter perverse things.", "Yea, thou shalt be as he that lieth down in the midst of the sea, or as he that lieth upon the top of a mast.", "They have stricken me, shalt thou say, and I was not sick; they have beaten me, and I felt it not: when shall I awake? I will seek it yet again."] }, { chapter: 24, verses: ["Be not thou envious against evil men, neither desire to be with them.", "For their heart studieth destruction, and their lips talk of mischief.", "Through wisdom is an house builded; and by understanding it is established:", "And by knowledge shall the chambers be filled with all precious and pleasant riches.", "A wise man is strong; yea, a man of knowledge increaseth strength.", "For by wise counsel thou shalt make thy war: and in multitude of counsellors there is safety.", "Wisdom is too high for a fool: he openeth not his mouth in the gate.", "He that deviseth to do evil shall be called a mischievous person.", "The thought of foolishness is sin: and the scorner is an abomination to men.", "If thou faint in the day of adversity, thy strength is small.", "If thou forbear to deliver them that are drawn unto death, and those that are ready to be slain;", "If thou sayest, Behold, we knew it not; doth not he that pondereth the heart consider it? and he that keepeth thy soul, doth not he know it? and shall not he render to every man according to his works?", "My son, eat thou honey, because it is good; and the honeycomb, which is sweet to thy taste:", "So shall the knowledge of wisdom be unto thy soul: when thou hast found it, then there shall be a reward, and thy expectation shall not be cut off.", "Lay not wait, O wicked man, against the dwelling of the righteous; spoil not his resting place:", "For a just man falleth seven times, and riseth up again: but the wicked shall fall into mischief.", "Rejoice not when thine enemy falleth, and let not thine heart be glad when he stumbleth:", "Lest the LORD see it, and it displease him, and he turn away his wrath from him.", "Fret not thyself because of evil men, neither be thou envious at the wicked;", "For there shall be no reward to the evil man; the candle of the wicked shall be put out.", "My son, fear thou the LORD and the king: and meddle not with them that are given to change:", "For their calamity shall rise suddenly; and who knoweth the ruin of them both?", "These things also belong to the wise. It is not good to have respect of persons in judgment.", "He that saith unto the wicked, Thou art righteous; him shall the people curse, nations shall abhor him:", "But to them that rebuke him shall be delight, and a good blessing shall come upon them.", "Every man shall kiss his lips that giveth a right answer.", "Prepare thy work without, and make it fit for thyself in the field; and afterwards build thine house.", "Be not a witness against thy neighbour without cause; and deceive not with thy lips.", "Say not, I will do so to him as he hath done to me: I will render to the man according to his work.", "I went by the field of the slothful, and by the vineyard of the man void of understanding;", "And, lo, it was all grown over with thorns, and nettles had covered the face thereof, and the stone wall thereof was broken down.", "Then I saw, and considered it well: I looked upon it, and received instruction.", "Yet a little sleep, a little slumber, a little folding of the hands to sleep:", "So shall thy poverty come as one that travelleth; and thy want as an armed man."] }, { chapter: 25, verses: ["These are also proverbs of Solomon, which the men of Hezekiah king of Judah copied out.", "It is the glory of God to conceal a thing: but the honour of kings is to search out a matter.", "The heaven for height, and the earth for depth, and the heart of kings is unsearchable.", "Take away the dross from the silver, and there shall come forth a vessel for the finer.", "Take away the wicked from before the king, and his throne shall be established in righteousness.", "Put not forth thyself in the presence of the king, and stand not in the place of great men:", "For better it is that it be said unto thee, Come up hither; than that thou shouldest be put lower in the presence of the prince whom thine eyes have seen.", "Go not forth hastily to strive, lest thou know not what to do in the end thereof, when thy neighbour hath put thee to shame.", "Debate thy cause with thy neighbour himself; and discover not a secret to another:", "Lest he that heareth it put thee to shame, and thine infamy turn not away.", "A word fitly spoken is like apples of gold in pictures of silver.", "As an earring of gold, and an ornament of fine gold, so is a wise reprover upon an obedient ear.", "As the cold of snow in the time of harvest, so is a faithful messenger to them that send him: for he refresheth the soul of his masters.", "Whoso boasteth himself of a false gift is like clouds and wind without rain.", "By long forbearing is a prince persuaded, and a soft tongue breaketh the bone.", "Hast thou found honey? eat so much as is sufficient for thee, lest thou be filled therewith, and vomit it.", "Withdraw thy foot from thy neighbour\u2019s house; lest he be weary of thee, and so hate thee.", "A man that beareth false witness against his neighbour is a maul, and a sword, and a sharp arrow.", "Confidence in an unfaithful man in time of trouble is like a broken tooth, and a foot out of joint.", "As he that taketh away a garment in cold weather, and as vinegar upon nitre, so is he that singeth songs to an heavy heart.", "If thine enemy be hungry, give him bread to eat; and if he be thirsty, give him water to drink:", "For thou shalt heap coals of fire upon his head, and the LORD shall reward thee.", "The north wind driveth away rain: so doth an angry countenance a backbiting tongue.", "It is better to dwell in the corner of the housetop, than with a brawling woman and in a wide house.", "As cold waters to a thirsty soul, so is good news from a far country.", "A righteous man falling down before the wicked is as a troubled fountain, and a corrupt spring.", "It is not good to eat much honey: so for men to search their own glory is not glory.", "He that hath no rule over his own spirit is like a city that is broken down, and without walls."] }, { chapter: 26, verses: ["As snow in summer, and as rain in harvest, so honour is not seemly for a fool.", "As the bird by wandering, as the swallow by flying, so the curse causeless shall not come.", "A whip for the horse, a bridle for the ass, and a rod for the fool\u2019s back.", "Answer not a fool according to his folly, lest thou also be like unto him.", "Answer a fool according to his folly, lest he be wise in his own conceit.", "He that sendeth a message by the hand of a fool cutteth off the feet, and drinketh damage.", "The legs of the lame are not equal: so is a parable in the mouth of fools.", "As he that bindeth a stone in a sling, so is he that giveth honour to a fool.", "As a thorn goeth up into the hand of a drunkard, so is a parable in the mouth of fools.", "The great God that formed all things both rewardeth the fool, and rewardeth transgressors.", "As a dog returneth to his vomit, so a fool returneth to his folly.", "Seest thou a man wise in his own conceit? there is more hope of a fool than of him.", "The slothful man saith, There is a lion in the way; a lion is in the streets.", "As the door turneth upon his hinges, so doth the slothful upon his bed.", "The slothful hideth his hand in his bosom; it grieveth him to bring it again to his mouth.", "The sluggard is wiser in his own conceit than seven men that can render a reason.", "He that passeth by, and meddleth with strife belonging not to him, is like one that taketh a dog by the ears.", "As a mad man who casteth firebrands, arrows, and death,", "So is the man that deceiveth his neighbour, and saith, Am not I in sport?", "Where no wood is, there the fire goeth out: so where there is no talebearer, the strife ceaseth.", "As coals are to burning coals, and wood to fire; so is a contentious man to kindle strife.", "The words of a talebearer are as wounds, and they go down into the innermost parts of the belly.", "Burning lips and a wicked heart are like a potsherd covered with silver dross.", "He that hateth dissembleth with his lips, and layeth up deceit within him;", "When he speaketh fair, believe him not: for there are seven abominations in his heart.", "Whose hatred is covered by deceit, his wickedness shall be shewed before the whole congregation.", "Whoso diggeth a pit shall fall therein: and he that rolleth a stone, it will return upon him.", "A lying tongue hateth those that are afflicted by it; and a flattering mouth worketh ruin."] }, { chapter: 27, verses: ["Boast not thyself of to morrow; for thou knowest not what a day may bring forth.", "Let another man praise thee, and not thine own mouth; a stranger, and not thine own lips.", "A stone is heavy, and the sand weighty; but a fool\u2019s wrath is heavier than them both.", "Wrath is cruel, and anger is outrageous; but who is able to stand before envy?", "Open rebuke is better than secret love.", "Faithful are the wounds of a friend; but the kisses of an enemy are deceitful.", "The full soul loatheth an honeycomb; but to the hungry soul every bitter thing is sweet.", "As a bird that wandereth from her nest, so is a man that wandereth from his place.", "Ointment and perfume rejoice the heart: so doth the sweetness of a man\u2019s friend by hearty counsel.", "Thine own friend, and thy father\u2019s friend, forsake not; neither go into thy brother\u2019s house in the day of thy calamity: for better is a neighbour that is near than a brother far off.", "My son, be wise, and make my heart glad, that I may answer him that reproacheth me.", "A prudent man foreseeth the evil, and hideth himself; but the simple pass on, and are punished.", "Take his garment that is surety for a stranger, and take a pledge of him for a strange woman.", "He that blesseth his friend with a loud voice, rising early in the morning, it shall be counted a curse to him.", "A continual dropping in a very rainy day and a contentious woman are alike.", "Whosoever hideth her hideth the wind, and the ointment of his right hand, which bewrayeth itself.", "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.", "Whoso keepeth the fig tree shall eat the fruit thereof: so he that waiteth on his master shall be honoured.", "As in water face answereth to face, so the heart of man to man.", "Hell and destruction are never full; so the eyes of man are never satisfied.", "As the fining pot for silver, and the furnace for gold; so is a man to his praise.", "Though thou shouldest bray a fool in a mortar among wheat with a pestle, yet will not his foolishness depart from him.", "Be thou diligent to know the state of thy flocks, and look well to thy herds.", "For riches are not for ever: and doth the crown endure to every generation?", "The hay appeareth, and the tender grass sheweth itself, and herbs of the mountains are gathered.", "The lambs are for thy clothing, and the goats are the price of the field.", "And thou shalt have goats\u2019 milk enough for thy food, for the food of thy household, and for the maintenance for thy maidens."] }, { chapter: 28, verses: ["The wicked flee when no man pursueth: but the righteous are bold as a lion.", "For the transgression of a land many are the princes thereof: but by a man of understanding and knowledge the state thereof shall be prolonged.", "A poor man that oppresseth the poor is like a sweeping rain which leaveth no food.", "They that forsake the law praise the wicked: but such as keep the law contend with them.", "Evil men understand not judgment: but they that seek the LORD understand all things.", "Better is the poor that walketh in his uprightness, than he that is perverse in his ways, though he be rich.", "Whoso keepeth the law is a wise son: but he that is a companion of riotous men shameth his father.", "He that by usury and unjust gain increaseth his substance, he shall gather it for him that will pity the poor.", "He that turneth away his ear from hearing the law, even his prayer shall be abomination.", "Whoso causeth the righteous to go astray in an evil way, he shall fall himself into his own pit: but the upright shall have good things in possession.", "The rich man is wise in his own conceit; but the poor that hath understanding searcheth him out.", "When righteous men do rejoice, there is great glory: but when the wicked rise, a man is hidden.", "He that covereth his sins shall not prosper: but whoso confesseth and forsaketh them shall have mercy.", "Happy is the man that feareth alway: but he that hardeneth his heart shall fall into mischief.", "As a roaring lion, and a ranging bear; so is a wicked ruler over the poor people.", "The prince that wanteth understanding is also a great oppressor: but he that hateth covetousness shall prolong his days.", "A man that doeth violence to the blood of any person shall flee to the pit; let no man stay him.", "Whoso walketh uprightly shall be saved: but he that is perverse in his ways shall fall at once.", "He that tilleth his land shall have plenty of bread: but he that followeth after vain persons shall have poverty enough.", "A faithful man shall abound with blessings: but he that maketh haste to be rich shall not be innocent.", "To have respect of persons is not good: for for a piece of bread that man will transgress.", "He that hasteth to be rich hath an evil eye, and considereth not that poverty shall come upon him.", "He that rebuketh a man afterwards shall find more favour than he that flattereth with the tongue.", "Whoso robbeth his father or his mother, and saith, It is no transgression; the same is the companion of a destroyer.", "He that is of a proud heart stirreth up strife: but he that putteth his trust in the LORD shall be made fat.", "He that trusteth in his own heart is a fool: but whoso walketh wisely, he shall be delivered.", "He that giveth unto the poor shall not lack: but he that hideth his eyes shall have many a curse.", "When the wicked rise, men hide themselves: but when they perish, the righteous increase."] }, { chapter: 29, verses: ["He, that being often reproved hardeneth his neck, shall suddenly be destroyed, and that without remedy.", "When the righteous are in authority, the people rejoice: but when the wicked beareth rule, the people mourn.", "Whoso loveth wisdom rejoiceth his father: but he that keepeth company with harlots spendeth his substance.", "The king by judgment establisheth the land: but he that receiveth gifts overthroweth it.", "A man that flattereth his neighbour spreadeth a net for his feet.", "In the transgression of an evil man there is a snare: but the righteous doth sing and rejoice.", "The righteous considereth the cause of the poor: but the wicked regardeth not to know it.", "Scornful men bring a city into a snare: but wise men turn away wrath.", "If a wise man contendeth with a foolish man, whether he rage or laugh, there is no rest.", "The bloodthirsty hate the upright: but the just seek his soul.", "A fool uttereth all his mind: but a wise man keepeth it in till afterwards.", "If a ruler hearken to lies, all his servants are wicked.", "The poor and the deceitful man meet together: the LORD lighteneth both their eyes.", "The king that faithfully judgeth the poor, his throne shall be established for ever.", "The rod and reproof give wisdom: but a child left to himself bringeth his mother to shame.", "When the wicked are multiplied, transgression increaseth: but the righteous shall see their fall.", "Correct thy son, and he shall give thee rest; yea, he shall give delight unto thy soul.", "Where there is no vision, the people perish: but he that keepeth the law, happy is he.", "A servant will not be corrected by words: for though he understand he will not answer.", "Seest thou a man that is hasty in his words? there is more hope of a fool than of him.", "He that delicately bringeth up his servant from a child shall have him become his son at the length.", "An angry man stirreth up strife, and a furious man aboundeth in transgression.", "A man\u2019s pride shall bring him low: but honour shall uphold the humble in spirit.", "Whoso is partner with a thief hateth his own soul: he heareth cursing, and bewrayeth it not.", "The fear of man bringeth a snare: but whoso putteth his trust in the LORD shall be safe.", "Many seek the ruler\u2019s favour; but every man\u2019s judgment cometh from the LORD.", "An unjust man is an abomination to the just: and he that is upright in the way is abomination to the wicked."] }, { chapter: 30, verses: ["The words of Agur the son of Jakeh, even the prophecy: the man spake unto Ithiel, even unto Ithiel and Ucal,", "Surely I am more brutish than any man, and have not the understanding of a man.", "I neither learned wisdom, nor have the knowledge of the holy.", "Who hath ascended up into heaven, or descended? who hath gathered the wind in his fists? who hath bound the waters in a garment? who hath established all the ends of the earth? what is his name, and what is his son\u2019s name, if thou canst tell?", "Every word of God is pure: he is a shield unto them that put their trust in him.", "Add thou not unto his words, lest he reprove thee, and thou be found a liar.", "Two things have I required of thee; deny me them not before I die:", "Remove far from me vanity and lies: give me neither poverty nor riches; feed me with food convenient for me:", "Lest I be full, and deny thee, and say, Who is the LORD? or lest I be poor, and steal, and take the name of my God in vain.", "Accuse not a servant unto his master, lest he curse thee, and thou be found guilty.", "There is a generation that curseth their father, and doth not bless their mother.", "There is a generation that are pure in their own eyes, and yet is not washed from their filthiness.", "There is a generation, O how lofty are their eyes! and their eyelids are lifted up.", "There is a generation, whose teeth are as swords, and their jaw teeth as knives, to devour the poor from off the earth, and the needy from among men.", "The horseleach hath two daughters, crying, Give, give. There are three things that are never satisfied, yea, four things say not, It is enough:", "The grave; and the barren womb; the earth that is not filled with water; and the fire that saith not, It is enough.", "The eye that mocketh at his father, and despiseth to obey his mother, the ravens of the valley shall pick it out, and the young eagles shall eat it.", "There be three things which are too wonderful for me, yea, four which I know not:", "The way of an eagle in the air; the way of a serpent upon a rock; the way of a ship in the midst of the sea; and the way of a man with a maid.", "Such is the way of an adulterous woman; she eateth, and wipeth her mouth, and saith, I have done no wickedness.", "For three things the earth is disquieted, and for four which it cannot bear:", "For a servant when he reigneth; and a fool when he is filled with meat;", "For an odious woman when she is married; and an handmaid that is heir to her mistress.", "There be four things which are little upon the earth, but they are exceeding wise:", "The ants are a people not strong, yet they prepare their meat in the summer;", "The conies are but a feeble folk, yet make they their houses in the rocks;", "The locusts have no king, yet go they forth all of them by bands;", "The spider taketh hold with her hands, and is in kings\u2019 palaces.", "There be three things which go well, yea, four are comely in going:", "A lion which is strongest among beasts, and turneth not away for any;", "A greyhound; an he goat also; and a king, against whom there is no rising up.", "If thou hast done foolishly in lifting up thyself, or if thou hast thought evil, lay thine hand upon thy mouth.", "Surely the churning of milk bringeth forth butter, and the wringing of the nose bringeth forth blood: so the forcing of wrath bringeth forth strife."] }, { chapter: 31, verses: ["The words of king Lemuel, the prophecy that his mother taught him.", "What, my son? and what, the son of my womb? and what, the son of my vows?", "Give not thy strength unto women, nor thy ways to that which destroyeth kings.", "It is not for kings, O Lemuel, it is not for kings to drink wine; nor for princes strong drink:", "Lest they drink, and forget the law, and pervert the judgment of any of the afflicted.", "Give strong drink unto him that is ready to perish, and wine unto those that be of heavy hearts.", "Let him drink, and forget his poverty, and remember his misery no more.", "Open thy mouth for the dumb in the cause of all such as are appointed to destruction.", "Open thy mouth, judge righteously, and plead the cause of the poor and needy.", "Who can find a virtuous woman? for her price is far above rubies.", "The heart of her husband doth safely trust in her, so that he shall have no need of spoil.", "She will do him good and not evil all the days of her life.", "She seeketh wool, and flax, and worketh willingly with her hands.", "She is like the merchants\u2019 ships; she bringeth her food from afar.", "She riseth also while it is yet night, and giveth meat to her household, and a portion to her maidens.", "She considereth a field, and buyeth it: with the fruit of her hands she planteth a vineyard.", "She girdeth her loins with strength, and strengtheneth her arms.", "She perceiveth that her merchandise is good: her candle goeth not out by night.", "She layeth her hands to the spindle, and her hands hold the distaff.", "She stretcheth out her hand to the poor; yea, she reacheth forth her hands to the needy.", "She is not afraid of the snow for her household: for all her household are clothed with scarlet.", "She maketh herself coverings of tapestry; her clothing is silk and purple.", "Her husband is known in the gates, when he sitteth among the elders of the land.", "She maketh fine linen, and selleth it; and delivereth girdles unto the merchant.", "Strength and honour are her clothing; and she shall rejoice in time to come.", "She openeth her mouth with wisdom; and in her tongue is the law of kindness.", "She looketh well to the ways of her household, and eateth not the bread of idleness.", "Her children arise up, and call her blessed; her husband also, and he praiseth her.", "Many daughters have done virtuously, but thou excellest them all.", "Favour is deceitful, and beauty is vain: but a woman that feareth the LORD, she shall be praised.", "Give her of the fruit of her hands; and let her own works praise her in the gates."] }] };

// src/core/proverbs.ts
var PROVERBS = proverbs_kjv_default;
function verseCounts() {
  return PROVERBS.chapters.map((c) => c.verses.length);
}
var TRANSLATION = PROVERBS.translation;
var TRANSLATION_NAME = PROVERBS.translationName;
var BOOK = PROVERBS.book;
function verseText(chapter, verse) {
  var _a;
  const c = PROVERBS.chapters[chapter - 1];
  if (!c) return "";
  return (_a = c.verses[verse - 1]) != null ? _a : "";
}
function reference(chapter, verse) {
  return `${BOOK} ${chapter}:${verse}`;
}

// src/panels/verse.ts
var VersePanel = class extends BasePanel {
  constructor() {
    super(...arguments);
    this.id = "verse";
    this.title = "Verse of the Day";
    this.shownRef = "";
  }
  async setup() {
    this.setInterval(() => {
      const { chapter, verse } = verseForDate(/* @__PURE__ */ new Date(), verseCounts());
      if (reference(chapter, verse) !== this.shownRef) this.rerender();
    }, 60 * 1e3);
  }
  renderBody() {
    placard(this.el, "Verse of the Day");
    const { chapter, verse } = verseForDate(/* @__PURE__ */ new Date(), verseCounts());
    this.shownRef = reference(chapter, verse);
    const card = this.el.createDiv({ cls: "dash-verse" });
    card.createDiv({ cls: "dash-verse-text", text: `\u201C${verseText(chapter, verse)}\u201D` });
    const cite = card.createDiv({ cls: "dash-verse-cite" });
    cite.createSpan({ cls: "dash-verse-ref", text: reference(chapter, verse) });
    cite.createSpan({ cls: "dash-verse-translation", text: TRANSLATION });
  }
};

// src/panels/todo.ts
var import_obsidian4 = require("obsidian");

// src/core/todostore.ts
var import_obsidian3 = require("obsidian");

// src/core/dailynote.ts
var import_obsidian2 = require("obsidian");
function getDailyNotesOptions(app) {
  var _a, _b, _c, _d;
  const dn = (_b = (_a = app.internalPlugins) == null ? void 0 : _a.getPluginById) == null ? void 0 : _b.call(_a, "daily-notes");
  return (_d = (_c = dn == null ? void 0 : dn.instance) == null ? void 0 : _c.options) != null ? _d : {};
}
function dailyNotesFolder(app) {
  var _a;
  const opts = getDailyNotesOptions(app);
  return ((_a = opts.folder) != null ? _a : "").trim().replace(/\/+$/, "");
}
function dailyNotePath(app, date) {
  var _a;
  const opts = getDailyNotesOptions(app);
  const format = opts.format || "YYYY-MM-DD";
  const folder = ((_a = opts.folder) != null ? _a : "").trim().replace(/\/+$/, "");
  const d = date != null ? date : (0, import_obsidian2.moment)().format("YYYY-MM-DD");
  const name = (0, import_obsidian2.moment)(d, "YYYY-MM-DD").format(format);
  return (0, import_obsidian2.normalizePath)((folder ? folder + "/" : "") + name + ".md");
}
function getDailyNoteFile(app, date) {
  const f = app.vault.getAbstractFileByPath(dailyNotePath(app, date));
  return f instanceof import_obsidian2.TFile ? f : null;
}
async function ensureDailyNote(app, date) {
  const path = dailyNotePath(app, date);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian2.TFile) return existing;
  await ensureParentFolder(app, path);
  const opts = getDailyNotesOptions(app);
  const body = await renderDailyTemplate(app, opts, path, date != null ? date : (0, import_obsidian2.moment)().format("YYYY-MM-DD"));
  const raced = app.vault.getAbstractFileByPath(path);
  if (raced instanceof import_obsidian2.TFile) return raced;
  return app.vault.create(path, body);
}
async function ensureParentFolder(app, path) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (!dir) return;
  if (app.vault.getAbstractFileByPath(dir) instanceof import_obsidian2.TFolder) return;
  await app.vault.createFolder(dir).catch(() => {
  });
}
async function renderDailyTemplate(app, opts, dailyPath, date) {
  var _a, _b, _c;
  const templateSetting = ((_a = opts.template) != null ? _a : "").trim();
  if (!templateSetting) return "";
  const templatePath = (0, import_obsidian2.normalizePath)(
    templateSetting.endsWith(".md") ? templateSetting : templateSetting + ".md"
  );
  const tFile = app.vault.getAbstractFileByPath(templatePath);
  if (!(tFile instanceof import_obsidian2.TFile)) return "";
  const raw = await app.vault.cachedRead(tFile);
  const basename = (_c = (_b = dailyPath.split("/").pop()) == null ? void 0 : _b.replace(/\.md$/, "")) != null ? _c : "";
  const m = (0, import_obsidian2.moment)(date, "YYYY-MM-DD");
  const now = (0, import_obsidian2.moment)();
  return raw.replace(/{{\s*title\s*}}/gi, basename).replace(/{{\s*date(?::([^}]+))?\s*}}/gi, (_, fmt2) => m.format(fmt2 || "YYYY-MM-DD")).replace(/{{\s*time(?::([^}]+))?\s*}}/gi, (_, fmt2) => now.format(fmt2 || "HH:mm"));
}
var HEADING_RE = /^#{1,6}\s/;
function headingField(heading) {
  const esc = heading.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { anchor: new RegExp(`^#{1,6}\\s+${esc}:?\\s*$`, "i") };
}
function locate(lines, spec) {
  var _a;
  const anchorIdx = lines.findIndex((l) => spec.anchor.test(l));
  if (anchorIdx === -1) return null;
  const stopAtHeading = spec.stopAtHeading !== false;
  let end = lines.length;
  for (let i = anchorIdx + 1; i < lines.length; i++) {
    if (stopAtHeading && HEADING_RE.test(lines[i])) {
      end = i;
      break;
    }
    if ((_a = spec.stops) == null ? void 0 : _a.some((re) => re.test(lines[i]))) {
      end = i;
      break;
    }
  }
  return { anchorIdx, start: anchorIdx + 1, end };
}
function readField(content, spec) {
  const lines = content.split("\n");
  const r = locate(lines, spec);
  if (!r) return "";
  return lines.slice(r.start, r.end).join("\n").replace(/^\n+/, "").replace(/\s+$/, "");
}
function replaceField(content, spec, body) {
  const lines = content.split("\n");
  const r = locate(lines, spec);
  if (!r) return content;
  const bodyLines = body.replace(/\s+$/, "").split("\n");
  const replacement = body.trim() ? ["", ...bodyLines, ""] : [""];
  lines.splice(r.start, r.end - r.start, ...replacement);
  return lines.join("\n");
}
var PLUGIN_LOG_LINE = /^- \d{2}:\d{2}\b/;
function insertLogLine(content, line, opts) {
  var _a;
  const lines = content.split("\n");
  if (lines.some((l) => l.trim() === line.trim())) return content;
  let anchor = -1;
  const marker = (_a = opts.marker) == null ? void 0 : _a.trim();
  if (marker) anchor = lines.findIndex((l) => l.includes(marker));
  if (anchor === -1) {
    const heading = opts.heading.trim().toLowerCase().replace(/:$/, "");
    anchor = lines.findIndex((l) => {
      const m = l.match(/^#{1,6}\s+(.*?)\s*$/);
      return !!m && m[1].trim().toLowerCase().replace(/:$/, "") === heading;
    });
  }
  if (anchor === -1) {
    const trimmed = content.replace(/\n+$/, "");
    return (trimmed ? trimmed + "\n\n" : "") + `# ${opts.heading.replace(/:$/, "")}
${line}
`;
  }
  let insertAt = anchor + 1;
  while (insertAt < lines.length && PLUGIN_LOG_LINE.test(lines[insertAt])) {
    const existingTime = lines[insertAt].slice(2, 7);
    if (existingTime > opts.time) break;
    insertAt++;
  }
  lines.splice(insertAt, 0, line);
  return lines.join("\n");
}
function openEditorFor(app, file) {
  var _a;
  for (const leaf of app.workspace.getLeavesOfType("markdown")) {
    const view = leaf.view;
    if (view instanceof import_obsidian2.MarkdownView && ((_a = view.file) == null ? void 0 : _a.path) === file.path) return view;
  }
  return null;
}
async function editDailyNote(app, transform, date) {
  const file = await ensureDailyNote(app, date);
  const view = openEditorFor(app, file);
  if (view) {
    const editor = view.editor;
    const before = editor.getValue();
    const after = transform(before);
    if (after !== before) {
      const { from, to, text } = minimalDiff(before, after);
      editor.replaceRange(text, editor.offsetToPos(from), editor.offsetToPos(to));
    }
    return;
  }
  await app.vault.process(file, transform);
}
function minimalDiff(a, b) {
  let start = 0;
  const max = Math.min(a.length, b.length);
  while (start < max && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  return { from: start, to: endA, text: b.slice(start, endB) };
}
async function writeDailyField(app, spec, body) {
  await editDailyNote(app, (content) => replaceField(content, spec, body));
}
async function readDailyField(app, spec) {
  const file = getDailyNoteFile(app);
  if (!file) return "";
  const view = openEditorFor(app, file);
  const content = view ? view.editor.getValue() : await app.vault.cachedRead(file);
  return readField(content, spec);
}
async function appendDailyLogLine(app, line, opts) {
  await editDailyNote(app, (content) => insertLogLine(content, line, opts));
}
function readHeadingSection(content, heading) {
  return readField(content, headingField(heading));
}
async function readDailyNoteRaw(app, date) {
  const file = getDailyNoteFile(app, date);
  if (!file) return "";
  const view = openEditorFor(app, file);
  return view ? view.editor.getValue() : app.vault.cachedRead(file);
}

// src/core/todostore.ts
var WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function describeRecurrence(r) {
  var _a, _b, _c;
  switch (r.type) {
    case "none":
      return "One-time";
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays";
    case "weekly": {
      const days = ((_a = r.days) != null ? _a : []).slice().sort((a, b) => a - b).map((d) => WEEKDAY_NAMES[d]);
      return days.length ? `Weekly \xB7 ${days.join(", ")}` : "Weekly";
    }
    case "monthly":
      return `Monthly \xB7 day ${(_b = r.date) != null ? _b : 1}`;
    case "everyNDays":
      return `Every ${(_c = r.n) != null ? _c : 2} days`;
  }
}
function todayStr() {
  return (0, import_obsidian3.moment)().format("YYYY-MM-DD");
}
function nowTime() {
  return (0, import_obsidian3.moment)().format("HH:mm");
}
function weekday(date) {
  return (0, import_obsidian3.moment)(date, "YYYY-MM-DD").day();
}
function dayOfMonth(date) {
  return (0, import_obsidian3.moment)(date, "YYYY-MM-DD").date();
}
function lastDayOfMonth(date) {
  return (0, import_obsidian3.moment)(date, "YYYY-MM-DD").daysInMonth();
}
function daysBetween(a, b) {
  return (0, import_obsidian3.moment)(b, "YYYY-MM-DD").diff((0, import_obsidian3.moment)(a, "YYYY-MM-DD"), "days");
}
var TodoStore = class {
  constructor(app, getItems, setItems, save, getLogTarget) {
    this.app = app;
    this.getItems = getItems;
    this.setItems = setItems;
    this.save = save;
    this.getLogTarget = getLogTarget;
  }
  all() {
    return this.getItems().slice().sort((a, b) => a.order - b.order);
  }
  anchorDate(item) {
    return item.scheduledDate || (0, import_obsidian3.moment)(item.createdAt).format("YYYY-MM-DD");
  }
  /** Whether `date` is an occurrence for this item's recurrence. */
  isOccurrence(item, date) {
    var _a, _b, _c;
    const start = item.scheduledDate;
    if (start && date < start) return false;
    const r = item.recurrence;
    switch (r.type) {
      case "none":
        return start ? date >= start : true;
      case "daily":
        return true;
      case "weekdays": {
        const d = weekday(date);
        return d >= 1 && d <= 5;
      }
      case "weekly":
        return ((_a = r.days) != null ? _a : []).includes(weekday(date));
      case "monthly": {
        const target = (_b = r.date) != null ? _b : 1;
        const dom = dayOfMonth(date);
        if (dom === target) return true;
        return target > lastDayOfMonth(date) && dom === lastDayOfMonth(date);
      }
      case "everyNDays": {
        const n = Math.max(1, (_c = r.n) != null ? _c : 2);
        return daysBetween(this.anchorDate(item), date) % n === 0;
      }
    }
  }
  /** Latest occurrence strictly before `date`, or null. Bounded scan. */
  previousOccurrence(item, date) {
    for (let i = 1; i <= 366; i++) {
      const d = (0, import_obsidian3.moment)(date, "YYYY-MM-DD").subtract(i, "days").format("YYYY-MM-DD");
      if (item.scheduledDate && d < item.scheduledDate) return null;
      if (this.isOccurrence(item, d)) return d;
    }
    return null;
  }
  isRecurring(item) {
    return item.recurrence.type !== "none";
  }
  isHiddenByTime(item, date) {
    if (item.scheduledDate && date < item.scheduledDate) return true;
    if (item.scheduledDate === date && item.scheduledTime) {
      return nowTime() < item.scheduledTime;
    }
    return false;
  }
  /** Instances to render for `date` (default today): eligible, not future-hidden. */
  instancesFor(date = todayStr()) {
    var _a, _b, _c, _d;
    const out = [];
    for (const item of this.all()) {
      if (this.isHiddenByTime(item, date)) continue;
      if (this.isRecurring(item)) {
        if (!this.isOccurrence(item, date)) continue;
        const done = ((_a = item.completions) != null ? _a : []).includes(date);
        const skipped = !done && ((_b = item.skips) != null ? _b : []).includes(date);
        const prev = this.previousOccurrence(item, date);
        const missed = !done && !skipped && !!prev && !((_c = item.completions) != null ? _c : []).includes(prev) && !((_d = item.skips) != null ? _d : []).includes(prev);
        out.push({
          item,
          recurring: true,
          done,
          skipped,
          flagged: missed,
          flagLabel: missed ? missedLabel(prev, date) : ""
        });
      } else {
        if (item.completed) {
          if (item.completedDate === date) {
            out.push({ item, recurring: false, done: true, skipped: false, flagged: false, flagLabel: "" });
          }
          continue;
        }
        const carried = !!item.scheduledDate && item.scheduledDate < date;
        out.push({
          item,
          recurring: false,
          done: false,
          skipped: false,
          flagged: carried,
          flagLabel: carried ? "carried over" : ""
        });
      }
    }
    return out;
  }
  /** Count of pending (undone, un-postponed, eligible) items today. */
  pendingCount(date = todayStr()) {
    return this.instancesFor(date).filter((i) => !i.done && !i.skipped).length;
  }
  // ----------------------------------------------------------- mutations
  async add(partial) {
    var _a;
    const items = this.getItems();
    const maxOrder = items.reduce((m, i) => Math.max(m, i.order), 0);
    const item = {
      id: cryptoId(),
      text: partial.text.trim(),
      recurrence: (_a = partial.recurrence) != null ? _a : { type: "none" },
      createdAt: Date.now(),
      order: maxOrder + 1,
      scheduledDate: partial.scheduledDate,
      scheduledTime: partial.scheduledTime,
      completions: [],
      skips: []
    };
    items.push(item);
    this.setItems(items);
    await this.save();
  }
  async update(id, patch) {
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    Object.assign(item, patch);
    this.setItems(items);
    await this.save();
  }
  /** First-class removal — deletes the item and all its recurrence. */
  async remove(id) {
    this.setItems(this.getItems().filter((i) => i.id !== id));
    await this.save();
  }
  async reorder(orderedIds) {
    const items = this.getItems();
    orderedIds.forEach((id, idx) => {
      const item = items.find((i) => i.id === id);
      if (item) item.order = idx;
    });
    this.setItems(items);
    await this.save();
  }
  /** Toggle completion for `date` (default today). Appends the archive line on
   * the transition into completed; un-completing does not touch the note. */
  async toggleComplete(id, date = todayStr()) {
    var _a, _b;
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    let didComplete = false;
    if (this.isRecurring(item)) {
      const set = new Set((_a = item.completions) != null ? _a : []);
      if (set.has(date)) {
        set.delete(date);
      } else {
        set.add(date);
        item.skips = ((_b = item.skips) != null ? _b : []).filter((d) => d !== date);
        didComplete = true;
      }
      item.completions = [...set];
    } else {
      if (item.completed && item.completedDate === date) {
        item.completed = false;
        item.completedDate = void 0;
      } else {
        item.completed = true;
        item.completedDate = date;
        didComplete = true;
      }
    }
    this.setItems(items);
    await this.save();
    if (didComplete && date === todayStr()) await this.archiveCompletion(item);
  }
  /** Dismiss/skip a single occurrence (recurring): leaves today's list, keeps
   * future recurrence, and does not flag the next occurrence as missed. */
  async skipInstance(id, date = todayStr()) {
    var _a, _b;
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (this.isRecurring(item)) {
      const set = new Set((_a = item.skips) != null ? _a : []);
      set.add(date);
      item.skips = [...set];
      item.completions = ((_b = item.completions) != null ? _b : []).filter((d) => d !== date);
    } else {
      item.completed = true;
      item.completedDate = date;
    }
    this.setItems(items);
    await this.save();
  }
  /** Un-postpone a skipped occurrence — bring it back to the active list. */
  async unskipInstance(id, date = todayStr()) {
    var _a;
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (this.isRecurring(item)) {
      item.skips = ((_a = item.skips) != null ? _a : []).filter((d) => d !== date);
    } else if (item.completedDate === date) {
      item.completed = false;
      item.completedDate = void 0;
    }
    this.setItems(items);
    await this.save();
  }
  async archiveCompletion(item) {
    const { marker, heading } = this.getLogTarget();
    const time = nowTime();
    try {
      await appendDailyLogLine(this.app, `- ${time} ${item.text}`, { marker, heading, time });
    } catch (e) {
      console.error("Daily Dashboard: could not archive completed task", e);
    }
  }
};
function missedLabel(prev, date) {
  if (!prev) return "missed";
  const diff = daysBetween(prev, date);
  if (diff === 1) return "missed yesterday";
  return `missed ${(0, import_obsidian3.moment)(prev, "YYYY-MM-DD").format("MMM D")}`;
}
function cryptoId() {
  const c = globalThis.crypto;
  if (c == null ? void 0 : c.randomUUID) return c.randomUUID();
  return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// src/panels/todo.ts
var TodoPanel = class extends BasePanel {
  constructor() {
    super(...arguments);
    this.id = "todo";
    this.title = "To-do";
  }
  renderBody() {
    const store = this.ctx.todos;
    const instances = store.instancesFor();
    const active = instances.filter((i) => !i.done && !i.skipped).sort(activeSort);
    const postponed = instances.filter((i) => i.skipped);
    const done = instances.filter((i) => i.done);
    const head = placard(this.el, "To-do");
    const overdue = active.filter((i) => i.flagged).length;
    if (overdue > 0) head.createSpan({ cls: "dash-chip dash-chip-warn", text: `${overdue} overdue` });
    head.createSpan({ cls: "dash-chip", text: `${active.length} to do` });
    const addBtn = this.el.createEl("button", { cls: "dash-btn dash-btn-primary dash-todo-add", text: "+ Add a to-do" });
    addBtn.addEventListener(
      "click",
      () => new TodoEditModal(this.ctx.app, store, void 0, () => this.after()).open()
    );
    const list = this.el.createDiv({ cls: "dash-todo-list" });
    if (active.length === 0) {
      list.createDiv({
        cls: "dash-empty",
        text: "Nothing to do yet. Tap \u201C+ Add a to-do\u201D to add your first one. You can make it repeat daily, weekly, or on any schedule you like."
      });
    }
    active.forEach((inst, idx) => this.renderRow(list, inst, idx, active.length));
    if (postponed.length > 0) {
      const details = this.el.createEl("details", { cls: "dash-todo-done" });
      details.createEl("summary", { text: `Postponed for today \xB7 ${postponed.length}` });
      const pList = details.createDiv({ cls: "dash-todo-list" });
      for (const inst of postponed) this.renderRow(pList, inst, -1, 0);
    }
    if (done.length > 0) {
      const details = this.el.createEl("details", { cls: "dash-todo-done" });
      details.createEl("summary", { text: `Done today \xB7 ${done.length}` });
      const doneList = details.createDiv({ cls: "dash-todo-list" });
      for (const inst of done) this.renderRow(doneList, inst, -1, 0);
    }
  }
  renderRow(parent, inst, idx, count) {
    const store = this.ctx.todos;
    const item = inst.item;
    const row = parent.createDiv({ cls: "dash-todo-row" });
    if (inst.flagged) row.addClass("is-flagged");
    if (inst.done || inst.skipped) row.addClass("is-done");
    const box = row.createEl("button", { cls: "dash-todo-check", attr: { "aria-label": inst.done ? "Mark not done" : "Mark done" } });
    box.setText(inst.done ? "\u2713" : "");
    box.addEventListener("click", async () => {
      await store.toggleComplete(item.id);
      this.after();
    });
    const main = row.createDiv({ cls: "dash-todo-main" });
    main.createDiv({ cls: "dash-todo-text", text: item.text });
    const meta = main.createDiv({ cls: "dash-todo-meta" });
    if (item.recurrence.type !== "none") meta.createSpan({ cls: "dash-chip dash-chip-cold", text: describeRecurrence(item.recurrence) });
    if (item.scheduledTime) meta.createSpan({ cls: "dash-chip", text: item.scheduledTime });
    if (inst.flagged) meta.createSpan({ cls: "dash-chip dash-chip-warn", text: inst.flagLabel });
    const actions = row.createDiv({ cls: "dash-todo-actions" });
    if (!inst.done && count > 1 && idx >= 0) {
      this.iconBtn(actions, "\u2191", "Move up", idx === 0, async () => {
        await this.move(idx, -1);
      });
      this.iconBtn(actions, "\u2193", "Move down", idx === count - 1, async () => {
        await this.move(idx, 1);
      });
    }
    this.iconBtn(actions, "\u270E", "Edit", false, () => {
      new TodoEditModal(this.ctx.app, store, item, () => this.after()).open();
    });
    if (inst.skipped) {
      this.iconBtn(actions, "\u21A9", "Bring back", false, async () => {
        await store.unskipInstance(item.id);
        this.after();
      });
    } else if (inst.recurring && !inst.done) {
      this.iconBtn(actions, "\u293C", "Skip just for today", false, async () => {
        await store.skipInstance(item.id);
        new import_obsidian4.Notice("Skipped for today. It comes back on the next occurrence.");
        this.after();
      });
    }
    this.iconBtn(actions, "\u{1F5D1}", "Delete", false, async () => {
      await store.remove(item.id);
      this.after();
    });
  }
  iconBtn(parent, glyph, label, disabled, onClick) {
    const b = parent.createEl("button", { cls: "dash-icon-btn dash-todo-icon", text: glyph, attr: { "aria-label": label, title: label } });
    if (disabled) b.setAttr("disabled", "true");
    else b.addEventListener("click", onClick);
  }
  async move(idx, delta) {
    const active = this.ctx.todos.instancesFor().filter((i) => !i.done && !i.skipped).sort(activeSort);
    const ids = active.map((i) => i.item.id);
    const j = idx + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    await this.ctx.todos.reorder(ids);
    this.after();
  }
  after() {
    this.ctx.requestRefresh("manual");
  }
};
function activeSort(a, b) {
  var _a, _b;
  if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
  const at = (_a = a.item.scheduledTime) != null ? _a : "99:99";
  const bt = (_b = b.item.scheduledTime) != null ? _b : "99:99";
  if (at !== bt) return at.localeCompare(bt);
  return a.item.order - b.item.order;
}
var WEEKDAYS = [
  { v: 1, label: "Mon" },
  { v: 2, label: "Tue" },
  { v: 3, label: "Wed" },
  { v: 4, label: "Thu" },
  { v: 5, label: "Fri" },
  { v: 6, label: "Sat" },
  { v: 0, label: "Sun" }
];
var TodoEditModal = class extends import_obsidian4.Modal {
  constructor(app, store, existing, onDone) {
    var _a, _b, _c, _d, _e, _f, _g;
    super(app);
    this.store = store;
    this.existing = existing;
    this.onDone = onDone;
    const e = existing;
    this.text = (_a = e == null ? void 0 : e.text) != null ? _a : "";
    this.recType = (_b = e == null ? void 0 : e.recurrence.type) != null ? _b : "none";
    this.weeklyDays = new Set((_c = e == null ? void 0 : e.recurrence.days) != null ? _c : [(0, import_obsidian4.moment)().day()]);
    this.monthlyDate = (_d = e == null ? void 0 : e.recurrence.date) != null ? _d : (0, import_obsidian4.moment)().date();
    this.everyN = (_e = e == null ? void 0 : e.recurrence.n) != null ? _e : 2;
    this.scheduledDate = (_f = e == null ? void 0 : e.scheduledDate) != null ? _f : "";
    this.scheduledTime = (_g = e == null ? void 0 : e.scheduledTime) != null ? _g : "";
  }
  onOpen() {
    this.titleEl.setText(this.existing ? "Edit to-do" : "New to-do");
    const { contentEl } = this;
    new import_obsidian4.Setting(contentEl).setName("To-do").addText((t) => {
      t.setPlaceholder("What needs doing?").setValue(this.text).onChange((v) => this.text = v);
      t.inputEl.classList.add("dash-modal-wide");
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });
    const dynamic = contentEl.createDiv();
    new import_obsidian4.Setting(contentEl).setName("Repeat").addDropdown((dd) => {
      dd.addOptions({
        none: "Just once",
        daily: "Every day",
        weekdays: "Weekdays (Mon\u2013Fri)",
        weekly: "Weekly",
        monthly: "Monthly",
        everyNDays: "Every N days"
      });
      dd.setValue(this.recType).onChange((v) => {
        this.recType = v;
        this.renderDynamic(dynamic);
      });
    });
    contentEl.appendChild(dynamic);
    this.renderDynamic(dynamic);
    new import_obsidian4.Setting(contentEl).setName("Start on").setDesc("Optional. Hide this until a date (and time). For repeats, this is the start date.").addText((t) => {
      t.inputEl.type = "date";
      t.setValue(this.scheduledDate).onChange((v) => this.scheduledDate = v);
    }).addText((t) => {
      t.inputEl.type = "time";
      t.setValue(this.scheduledTime).onChange((v) => this.scheduledTime = v);
    });
    new import_obsidian4.Setting(contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => this.close())).addButton((b) => b.setButtonText(this.existing ? "Save" : "Add").setCta().onClick(() => void this.submit()));
  }
  renderDynamic(host) {
    host.empty();
    if (this.recType === "weekly") {
      const s = new import_obsidian4.Setting(host).setName("On these days");
      for (const d of WEEKDAYS) {
        const btn = s.controlEl.createEl("button", { cls: "dash-day-toggle", text: d.label });
        if (this.weeklyDays.has(d.v)) btn.addClass("is-on");
        btn.addEventListener("click", () => {
          if (this.weeklyDays.has(d.v)) this.weeklyDays.delete(d.v);
          else this.weeklyDays.add(d.v);
          btn.toggleClass("is-on", this.weeklyDays.has(d.v));
        });
      }
    } else if (this.recType === "monthly") {
      new import_obsidian4.Setting(host).setName("Day of the month").addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "1";
        t.inputEl.max = "31";
        t.setValue(String(this.monthlyDate)).onChange((v) => this.monthlyDate = clamp(Number(v), 1, 31));
      });
    } else if (this.recType === "everyNDays") {
      new import_obsidian4.Setting(host).setName("Every").setDesc("days").addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "1";
        t.setValue(String(this.everyN)).onChange((v) => this.everyN = Math.max(1, Number(v) || 1));
      });
    }
  }
  buildRecurrence() {
    switch (this.recType) {
      case "weekly":
        return { type: "weekly", days: [...this.weeklyDays].sort((a, b) => a - b) };
      case "monthly":
        return { type: "monthly", date: this.monthlyDate };
      case "everyNDays":
        return { type: "everyNDays", n: this.everyN };
      default:
        return { type: this.recType };
    }
  }
  async submit() {
    const text = this.text.trim();
    if (!text) {
      new import_obsidian4.Notice("Please type what the to-do is.");
      return;
    }
    const patch = {
      text,
      recurrence: this.buildRecurrence(),
      scheduledDate: this.scheduledDate || void 0,
      scheduledTime: this.scheduledTime || void 0
    };
    if (this.existing) await this.store.update(this.existing.id, patch);
    else await this.store.add(patch);
    this.close();
    this.onDone();
  }
  onClose() {
    this.contentEl.empty();
  }
};
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}

// src/panels/agenda.ts
var import_obsidian6 = require("obsidian");

// src/core/ics.ts
var import_obsidian5 = require("obsidian");
function tzOffsetMinutes(tz, utcMs) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const parts = dtf.formatToParts(new Date(utcMs));
    const map = {};
    for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
    const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
    return (asUTC - utcMs) / 6e4;
  } catch (e) {
    return 0;
  }
}
function toEpochMs(v) {
  if (v.zone === "utc") return Date.UTC(v.y, v.mo - 1, v.d, v.h, v.mi, v.s);
  if (v.zone === "local") return new Date(v.y, v.mo - 1, v.d, v.h, v.mi, v.s).getTime();
  const guess = Date.UTC(v.y, v.mo - 1, v.d, v.h, v.mi, v.s);
  let off = tzOffsetMinutes(v.zone, guess);
  let utc = guess - off * 6e4;
  off = tzOffsetMinutes(v.zone, utc);
  utc = guess - off * 6e4;
  return utc;
}
function unfold(text) {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("	")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}
function parseDateVal(rawKey, value) {
  const params = rawKey.split(";").slice(1);
  let tzid = "";
  let isDate = false;
  for (const p of params) {
    const [k, v2] = p.split("=");
    if (k.toUpperCase() === "TZID") tzid = v2;
    if (k.toUpperCase() === "VALUE" && v2.toUpperCase() === "DATE") isDate = true;
  }
  const v = value.trim();
  if (isDate || /^\d{8}$/.test(v)) {
    return {
      allDay: true,
      y: +v.slice(0, 4),
      mo: +v.slice(4, 6),
      d: +v.slice(6, 8),
      h: 0,
      mi: 0,
      s: 0,
      zone: "local"
    };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) {
    const mm = (0, import_obsidian5.moment)(v);
    return { allDay: false, y: mm.year(), mo: mm.month() + 1, d: mm.date(), h: mm.hour(), mi: mm.minute(), s: mm.second(), zone: "local" };
  }
  const zone = m[7] ? "utc" : tzid || "local";
  return { allDay: false, y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +m[6], zone };
}
var WEEKDAY_CODES = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function parseRRule(value) {
  const parts = {};
  for (const seg of value.split(";")) {
    const [k, v] = seg.split("=");
    if (k && v) parts[k.toUpperCase()] = v;
  }
  const freq = parts.FREQ;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return void 0;
  const rule = { freq, interval: Math.max(1, Number(parts.INTERVAL) || 1) };
  if (parts.COUNT) rule.count = Number(parts.COUNT);
  if (parts.UNTIL) rule.until = parseDateVal("UNTIL", parts.UNTIL);
  if (parts.BYDAY) {
    rule.byday = parts.BYDAY.split(",").map((c) => WEEKDAY_CODES[c.replace(/^[+-]?\d+/, "").toUpperCase()]).filter((n) => n !== void 0);
  }
  if (parts.BYMONTHDAY) rule.bymonthday = parts.BYMONTHDAY.split(",").map(Number);
  return rule;
}
function parseICS(text) {
  const lines = unfold(text);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = { summary: "", location: "", uid: "", exdates: /* @__PURE__ */ new Set() };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.start) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(";")[0].toUpperCase();
    switch (key) {
      case "UID":
        cur.uid = value.trim();
        break;
      case "SUMMARY":
        cur.summary = unescapeText(value);
        break;
      case "LOCATION":
        cur.location = unescapeText(value);
        break;
      case "DTSTART":
        cur.start = parseDateVal(rawKey, value);
        break;
      case "DTEND":
        cur.end = parseDateVal(rawKey, value);
        break;
      case "RRULE":
        cur.rrule = parseRRule(value);
        break;
      case "EXDATE": {
        for (const piece of value.split(",")) {
          const dv = parseDateVal(rawKey, piece);
          cur.exdates.add(canonicalDate(dv));
        }
        break;
      }
      case "RECURRENCE-ID": {
        cur.recurrenceId = canonicalDate(parseDateVal(rawKey, value));
        break;
      }
    }
  }
  return events;
}
function unescapeText(v) {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}
function canonicalDate(v) {
  return `${pad4(v.y)}-${pad2(v.mo)}-${pad2(v.d)}`;
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function pad4(n) {
  return String(n).padStart(4, "0");
}
function occurrencesOn(ev, targetDate) {
  const start = ev.start;
  const localDateOf = (v) => v.allDay ? canonicalDate(v) : (0, import_obsidian5.moment)(toEpochMs(v)).format("YYYY-MM-DD");
  if (!ev.rrule) {
    if (localDateOf(start) === targetDate) return [start];
    if (ev.end && spansDate(ev, targetDate)) return [start];
    return [];
  }
  const rule = ev.rrule;
  const results = [];
  const targetEndMs = (0, import_obsidian5.moment)(targetDate, "YYYY-MM-DD").endOf("day").valueOf();
  const untilMs = rule.until ? toEpochMs(rule.until) : Infinity;
  let emitted = 0;
  const guard = 2e4;
  const cursor = { y: start.y, mo: start.mo, d: start.d };
  for (let i = 0; i < guard; i++) {
    const candidates = expandPeriod(rule, cursor, start);
    for (const cand of candidates) {
      const occ = { ...start, y: cand.y, mo: cand.mo, d: cand.d };
      const occMs = occ.allDay ? Date.UTC(occ.y, occ.mo - 1, occ.d) : toEpochMs(occ);
      if (compareTuple(cand, { y: start.y, mo: start.mo, d: start.d }) < 0) continue;
      if (occMs > untilMs && rule.until) return results;
      if (ev.exdates.has(canonicalDate(occ))) continue;
      emitted++;
      if (localDateOf(occ) === targetDate) results.push(occ);
      if (rule.count && emitted >= rule.count) return results;
    }
    advancePeriod(rule, cursor);
    const cursorStartMs = Date.UTC(cursor.y, cursor.mo - 1, cursor.d);
    if (cursorStartMs > targetEndMs + 8 * 864e5) break;
  }
  return results;
}
function expandPeriod(rule, cursor, start) {
  if (rule.freq === "WEEKLY" && rule.byday && rule.byday.length) {
    const base = new Date(Date.UTC(cursor.y, cursor.mo - 1, cursor.d));
    const dow = base.getUTCDay();
    const weekStart = new Date(base.getTime() - dow * 864e5);
    return rule.byday.slice().sort((a, b) => a - b).map((wd) => {
      const dt = new Date(weekStart.getTime() + wd * 864e5);
      return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
    });
  }
  if (rule.freq === "MONTHLY" && rule.bymonthday && rule.bymonthday.length) {
    return rule.bymonthday.map((md) => clampDay({ y: cursor.y, mo: cursor.mo, d: md }));
  }
  return [{ y: cursor.y, mo: cursor.mo, d: cursor.d }];
}
function advancePeriod(rule, cursor) {
  const step = rule.interval;
  if (rule.freq === "DAILY") {
    const dt = new Date(Date.UTC(cursor.y, cursor.mo - 1, cursor.d + step));
    assign(cursor, dt);
  } else if (rule.freq === "WEEKLY") {
    const dt = new Date(Date.UTC(cursor.y, cursor.mo - 1, cursor.d + 7 * step));
    assign(cursor, dt);
  } else if (rule.freq === "MONTHLY") {
    let mo = cursor.mo - 1 + step;
    let y = cursor.y + Math.floor(mo / 12);
    mo = (mo % 12 + 12) % 12;
    cursor.y = y;
    cursor.mo = mo + 1;
  } else {
    cursor.y += step;
  }
}
function assign(cursor, dt) {
  cursor.y = dt.getUTCFullYear();
  cursor.mo = dt.getUTCMonth() + 1;
  cursor.d = dt.getUTCDate();
}
function clampDay(t) {
  const dim = new Date(Date.UTC(t.y, t.mo, 0)).getUTCDate();
  return { y: t.y, mo: t.mo, d: Math.min(t.d, dim) };
}
function compareTuple(a, b) {
  return a.y - b.y || a.mo - b.mo || a.d - b.d;
}
function spansDate(ev, targetDate) {
  if (!ev.end) return false;
  const startDay = ev.start.allDay ? canonicalDate(ev.start) : (0, import_obsidian5.moment)(toEpochMs(ev.start)).format("YYYY-MM-DD");
  const endMs = ev.end.allDay ? (0, import_obsidian5.moment)(canonicalDate(ev.end), "YYYY-MM-DD").valueOf() : toEpochMs(ev.end);
  const targetStartMs = (0, import_obsidian5.moment)(targetDate, "YYYY-MM-DD").startOf("day").valueOf();
  const startMs = ev.start.allDay ? (0, import_obsidian5.moment)(startDay, "YYYY-MM-DD").valueOf() : toEpochMs(ev.start);
  return startMs <= (0, import_obsidian5.moment)(targetDate, "YYYY-MM-DD").endOf("day").valueOf() && endMs > targetStartMs;
}
function eventsOnDate(events, localDate) {
  const overridden = /* @__PURE__ */ new Set();
  for (const ev of events) if (ev.recurrenceId) overridden.add(`${ev.uid}|${ev.recurrenceId}`);
  const items = [];
  for (const ev of events) {
    const occs = ev.recurrenceId ? occurrencesOn(ev, localDate) : occurrencesOn(ev, localDate).filter(
      (o) => !overridden.has(`${ev.uid}|${canonicalDate(o)}`)
    );
    for (const occ of occs) items.push(toAgendaItem(ev, occ));
  }
  items.sort((a, b) => a.sortKey - b.sortKey || a.summary.localeCompare(b.summary));
  return items;
}
function toAgendaItem(ev, occ) {
  if (occ.allDay) {
    return {
      summary: ev.summary || "(untitled)",
      location: ev.location,
      allDay: true,
      startMs: (0, import_obsidian5.moment)(canonicalDate(occ), "YYYY-MM-DD").valueOf(),
      timeLabel: "",
      sortKey: -1
    };
  }
  const startMs = toEpochMs(occ);
  const startM = (0, import_obsidian5.moment)(startMs);
  let timeLabel = startM.format("HH:mm");
  if (ev.end && !ev.end.allDay) {
    const origStart = toEpochMs(ev.start);
    const origEnd = toEpochMs(ev.end);
    const durMs = Math.max(0, origEnd - origStart);
    timeLabel += `\u2013${(0, import_obsidian5.moment)(startMs + durMs).format("HH:mm")}`;
  }
  return {
    summary: ev.summary || "(untitled)",
    location: ev.location,
    allDay: false,
    startMs,
    timeLabel,
    sortKey: startM.hour() * 60 + startM.minute()
  };
}
async function fetchICS(url) {
  const res = await (0, import_obsidian5.requestUrl)({ url, method: "GET", throw: false });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text;
}

// src/core/themes.ts
var THEMES = [
  {
    id: "sleek",
    label: "Sleek Modern",
    blurb: "Clean and near-monochrome, with a single deep-green accent. A calm, neutral place to start."
  },
  {
    id: "pastel",
    label: "Pastel / Floral",
    blurb: "Soft and warm \u2014 dusty rose, sage, and lavender, with gentle rounded corners."
  },
  {
    id: "mellow",
    label: "Mellow",
    blurb: "A quiet mix of muted violet, orange, and dusty blue. Easy on the eyes."
  },
  {
    id: "geometric",
    label: "Geometric",
    blurb: "Bold and graphic \u2014 vermilion, ochre, and cobalt blocks with sharp edges and thick rules."
  }
];
var DEFAULT_THEME = "sleek";
function isThemeId(id) {
  return THEMES.some((t) => t.id === id);
}
var CALENDAR_TOKEN_COUNT = 8;
function calendarColorVar(index) {
  return `var(--dash-cal-${index % CALENDAR_TOKEN_COUNT + 1})`;
}

// src/panels/agenda.ts
var FETCH_CONCURRENCY = 4;
var AgendaPanel = class extends BasePanel {
  constructor() {
    super(...arguments);
    this.id = "agenda";
    this.title = "Today's Agenda";
    this.errors = /* @__PURE__ */ new Map();
    this.fetching = false;
    /** Set once the user scrolls the list; suppresses auto-scroll-to-now until
     * they press "back to now". Persists across re-renders (per session). */
    this.userScrolled = false;
    this.lastScrollTop = 0;
    this.suppressScrollHandler = false;
  }
  async setup() {
    const minutes = Math.max(1, this.ctx.settings().agendaRefreshMinutes || 30);
    this.setInterval(() => void this.fetchAll(), minutes * 60 * 1e3);
    void this.fetchAll();
  }
  renderBody() {
    const s = this.ctx.settings();
    const head = placard(this.el, "Today's Agenda");
    head.createSpan({ cls: "dash-placard-badge", text: (0, import_obsidian6.moment)().format("ddd, MMM D") });
    if (s.agendaUrls.length === 0) {
      this.el.createDiv({
        cls: "dash-empty",
        text: "No calendars yet. Add your calendar share links in the plugin settings (Settings \u2192 Daily Dashboard \u2192 Today's agenda) and today's events will appear here."
      });
      return;
    }
    const today2 = (0, import_obsidian6.moment)().format("YYYY-MM-DD");
    const rows = [];
    let anyCache = false;
    let oldest = Infinity;
    s.agendaUrls.forEach((cal, i) => {
      const cache = this.ctx.plugin.agendaCache[cal.url];
      if (cache) {
        anyCache = true;
        oldest = Math.min(oldest, cache.fetchedAt);
        try {
          for (const item of eventsOnDate(parseICS(cache.text), today2)) {
            rows.push({ item, colorIndex: i, label: cal.label });
          }
        } catch (e) {
          this.errors.set(cal.url, "couldn't be read");
        }
      }
    });
    const failed = s.agendaUrls.filter((c) => this.errors.has(c.url));
    if (failed.length) {
      const box = this.el.createDiv({ cls: "dash-agenda-alert" });
      for (const c of failed) {
        box.createDiv({
          cls: "dash-agenda-alert-line",
          text: `\u201C${c.label}\u201D couldn't be reached (${this.errors.get(c.url)}). A share link can quietly stop working on the calendar's side \u2014 this one may need to be renewed and re-added.`
        });
      }
    }
    rows.sort((a, b) => a.item.sortKey - b.item.sortKey || a.item.summary.localeCompare(b.item.summary));
    const list = this.el.createDiv({ cls: "dash-agenda-list" });
    list.style.height = `${Math.max(120, s.agendaHeight || 320)}px`;
    if (rows.length === 0 && !failed.length) {
      list.createDiv({ cls: "dash-empty", text: "Nothing on the calendar today." });
    }
    const nowMinutes = (0, import_obsidian6.moment)().hour() * 60 + (0, import_obsidian6.moment)().minute();
    let nowMarker = null;
    let markerPlaced = false;
    const placeMarkerBefore = () => {
      const m = list.createDiv({ cls: "dash-agenda-now" });
      m.createSpan({ cls: "dash-agenda-now-label", text: `now \xB7 ${(0, import_obsidian6.moment)().format(this.ctx.settings().clock24h ? "H:mm" : "h:mm A")}` });
      return m;
    };
    for (const r of rows) {
      if (!markerPlaced && !r.item.allDay && r.item.sortKey >= nowMinutes) {
        nowMarker = placeMarkerBefore();
        markerPlaced = true;
      }
      const row = list.createDiv({ cls: "dash-agenda-row" });
      const swatch = row.createSpan({ cls: "dash-agenda-swatch" });
      swatch.style.background = calendarColorVar(r.colorIndex);
      const time = row.createSpan({ cls: "dash-agenda-time" });
      time.setText(r.item.allDay ? "all day" : r.item.timeLabel);
      const body = row.createDiv({ cls: "dash-agenda-body" });
      body.createDiv({ cls: "dash-agenda-title", text: r.item.summary });
      const sub = [r.label, r.item.location].filter(Boolean).join(" \xB7 ");
      if (sub) body.createDiv({ cls: "dash-agenda-sub", text: sub });
    }
    if (!markerPlaced && rows.some((r) => !r.item.allDay)) {
      nowMarker = placeMarkerBefore();
    }
    const backToNow = this.el.createEl("button", { cls: "dash-agenda-backtonow", text: "\u2195 Back to now" });
    backToNow.addEventListener("click", () => {
      this.userScrolled = false;
      this.scrollToNow(list, nowMarker);
    });
    list.addEventListener("scroll", () => {
      if (this.suppressScrollHandler) return;
      this.userScrolled = true;
      this.lastScrollTop = list.scrollTop;
    });
    window.requestAnimationFrame(() => {
      if (!list.isConnected) return;
      if (this.userScrolled) this.setScrollTop(list, this.lastScrollTop);
      else this.scrollToNow(list, nowMarker);
    });
    if (anyCache && oldest !== Infinity) {
      const age = Date.now() - oldest;
      if (age > 90 * 1e3) {
        this.el.createDiv({
          cls: "dash-agenda-age",
          text: `Showing the last update from ${(0, import_obsidian6.moment)(oldest).fromNow()}. Calendars can take up to eight hours to show a change; a fresh check is on its way.`
        });
      }
    }
  }
  scrollToNow(list, marker) {
    if (!marker) {
      this.setScrollTop(list, 0);
      return;
    }
    const target = Math.max(0, marker.offsetTop - list.clientHeight / 2);
    this.setScrollTop(list, target);
  }
  setScrollTop(list, top) {
    this.suppressScrollHandler = true;
    list.scrollTop = top;
    this.lastScrollTop = top;
    window.setTimeout(() => this.suppressScrollHandler = false, 50);
  }
  async fetchAll() {
    var _a;
    if (this.fetching) return;
    const urls = this.ctx.settings().agendaUrls;
    if (urls.length === 0) return;
    this.fetching = true;
    let changed = false;
    try {
      const queue = urls.slice();
      const worker = async () => {
        for (; ; ) {
          const cal = queue.shift();
          if (!cal) return;
          try {
            const text = await fetchICS(cal.url);
            this.ctx.plugin.agendaCache[cal.url] = { text, fetchedAt: Date.now() };
            this.errors.delete(cal.url);
            changed = true;
          } catch (e) {
            this.errors.set(cal.url, humanizeFetchError(e));
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, urls.length) }, worker));
      if (changed) await this.ctx.plugin.saveData_();
    } finally {
      this.fetching = false;
    }
    if ((_a = this.el) == null ? void 0 : _a.isConnected) this.rerender();
  }
};
function humanizeFetchError(e) {
  var _a;
  const msg = String((_a = e == null ? void 0 : e.message) != null ? _a : e);
  if (/HTTP\s*4\d\d/.test(msg)) return "the link was refused";
  if (/HTTP\s*5\d\d/.test(msg)) return "the calendar server had an error";
  if (/network|fetch|ENOTFOUND|timeout/i.test(msg)) return "no connection";
  return msg;
}

// src/panels/journal.ts
var import_obsidian7 = require("obsidian");
var FIELDS = [
  { key: "braindump", label: "Brain dump", spec: headingField("Brain dump") },
  { key: "journal", label: "Journal", spec: headingField("Journal") },
  { key: "reference", label: "Reference tomorrow", spec: headingField("Reference tomorrow") }
];
var JournalPanel = class extends BasePanel {
  constructor() {
    super(...arguments);
    this.id = "journal";
    this.title = "Journal";
    this.editing = false;
  }
  async refresh(reason) {
    var _a;
    if (reason === "vault" && this.editing) return;
    if ((_a = this.el) == null ? void 0 : _a.isConnected) {
      this.el.empty();
      await this.renderBody();
    }
  }
  async renderBody() {
    placard(this.el, "Journal");
    await this.renderYesterdayReference();
    const wrap = this.el.createDiv({ cls: "dash-journal" });
    for (const field of FIELDS) {
      await this.renderField(wrap, field);
    }
  }
  /** Read-only carry-over of yesterday's "Reference tomorrow" onto today. */
  async renderYesterdayReference() {
    const yesterday = (0, import_obsidian7.moment)().subtract(1, "day").format("YYYY-MM-DD");
    let text = "";
    try {
      const raw = await readDailyNoteRaw(this.ctx.app, yesterday);
      text = readField(raw, headingField("Reference tomorrow")).trim();
    } catch (e) {
      console.error("Daily Dashboard: could not read yesterday's reference note", e);
    }
    if (!text) return;
    const block = this.el.createDiv({ cls: "dash-carry" });
    block.createDiv({ cls: "dash-carry-label", text: "From yesterday \u2014 to reference today" });
    block.createDiv({ cls: "dash-carry-body", text });
  }
  async renderField(parent, field) {
    const block = parent.createDiv({ cls: "dash-journal-field" });
    block.createDiv({ cls: "dash-journal-label", text: field.label });
    const ta = block.createEl("textarea", { cls: "dash-journal-input", attr: { placeholder: `Write in \u201C${field.label}\u201D\u2026` } });
    ta.value = await readDailyField(this.ctx.app, field.spec);
    autosize(ta);
    let timer = null;
    const save = () => {
      void writeDailyField(this.ctx.app, field.spec, ta.value).catch(
        (e) => console.error("Daily Dashboard: journal save failed", e)
      );
    };
    ta.addEventListener("focus", () => {
      this.editing = true;
      this.ctx.runtime.textFocused = true;
      this.ctx.runtime.typingUntil = Date.now() + 2e3;
    });
    ta.addEventListener("blur", () => {
      this.editing = false;
      this.ctx.runtime.textFocused = false;
      this.ctx.runtime.typingUntil = 0;
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      save();
    });
    ta.addEventListener("input", () => {
      this.ctx.runtime.typingUntil = Date.now() + 2e3;
      autosize(ta);
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        save();
      }, 800);
    });
    this.onCleanup(() => {
      if (timer !== null) window.clearTimeout(timer);
    });
  }
};
function autosize(ta) {
  ta.style.height = "auto";
  ta.style.height = Math.max(48, ta.scrollHeight) + "px";
}

// src/panels/meals.ts
var import_obsidian8 = require("obsidian");

// src/panels/util.ts
function commandButton(parent, bridge, fullId, label, opts = {}) {
  var _a;
  const btn = parent.createEl("button", { cls: `dash-btn ${(_a = opts.cls) != null ? _a : ""}`.trim(), text: label });
  if (!bridge.commandExists(fullId)) {
    btn.setAttr("disabled", "true");
    btn.addClass("is-unavailable");
    btn.setAttr("title", "This button needs its plugin. Enable the matching plugin to turn it on.");
    return btn;
  }
  btn.addEventListener("click", () => {
    var _a2;
    bridge.runCommand(fullId);
    (_a2 = opts.onRun) == null ? void 0 : _a2.call(opts);
  });
  return btn;
}

// src/panels/meals.ts
var MealsPanel = class extends BasePanel {
  constructor() {
    super(...arguments);
    this.id = "meals";
    this.title = "Meals";
  }
  async renderBody() {
    const { bridge } = this.ctx;
    placard(this.el, "Meals");
    if (!bridge.recipesAvailable()) {
      this.el.createDiv({
        cls: "dash-empty",
        text: "This panel works with the Recipe Manager plugin. Once it's installed and turned on, your planned meals and grocery list show up here. You can also hide this panel in the plugin settings."
      });
      return;
    }
    const meals = await bridge.plannedMeals();
    const mealsWrap = this.el.createDiv({ cls: "dash-meals" });
    mealsWrap.createDiv({ cls: "dash-subhead", text: "Planned today" });
    if (meals.length === 0) {
      mealsWrap.createDiv({ cls: "dash-muted", text: "No meals planned for today." });
    } else {
      const cards = mealsWrap.createDiv({ cls: "dash-meal-cards" });
      for (const meal of meals) {
        const card = cards.createDiv({ cls: "dash-meal-card" });
        card.createDiv({ cls: "dash-meal-name", text: meal.name });
        card.createDiv({ cls: "dash-meal-open", text: "Open recipe \u2192" });
        card.addEventListener("click", () => {
          const dest = this.ctx.app.metadataCache.getFirstLinkpathDest(meal.link, "");
          if (dest instanceof import_obsidian8.TFile) void this.ctx.app.workspace.getLeaf(false).openFile(dest);
        });
      }
    }
    const grocery = await bridge.groceryList();
    const gWrap = this.el.createDiv({ cls: "dash-grocery" });
    gWrap.createDiv({ cls: "dash-subhead", text: "Grocery list" });
    if (!grocery.exists) {
      gWrap.createDiv({ cls: "dash-muted", text: `No grocery list yet. Use \u201CBuild grocery list\u201D below to make one.` });
    } else if (grocery.items.length === 0) {
      gWrap.createDiv({ cls: "dash-muted", text: "Your grocery list is empty." });
    } else {
      const remaining = grocery.items.filter((i) => !i.checked).length;
      gWrap.createDiv({ cls: "dash-grocery-count", text: `${remaining} of ${grocery.items.length} still to get` });
      const list = gWrap.createDiv({ cls: "dash-grocery-list" });
      for (const item of grocery.items) {
        const row = list.createDiv({ cls: "dash-grocery-row" });
        if (item.checked) row.addClass("is-checked");
        row.createSpan({ cls: "dash-grocery-box", text: item.checked ? "\u2611" : "\u2610" });
        row.createSpan({ cls: "dash-grocery-name", text: item.name });
      }
    }
    const actions = this.el.createDiv({ cls: "dash-btn-row" });
    commandButton(actions, bridge, "recipe-manager:meal-plan", "Plan a meal", { cls: "dash-btn-primary" });
    commandButton(actions, bridge, "recipe-manager:grocery-list", "Build grocery list");
    commandButton(actions, bridge, "recipe-manager:open-recipe", "Open a recipe");
    commandButton(actions, bridge, "recipe-manager:new-recipe", "New recipe");
    commandButton(actions, bridge, "recipe-manager:recipe-index", "All recipes");
  }
};

// src/panels/search.ts
var import_obsidian10 = require("obsidian");

// src/panels/categorymodals.ts
var import_obsidian9 = require("obsidian");
var NewNoteModal = class extends import_obsidian9.Modal {
  constructor(app, store, onDone) {
    super(app);
    this.store = store;
    this.onDone = onDone;
    this.title = "";
    this.picked = "";
    this.newCategory = "";
  }
  onOpen() {
    this.titleEl.setText("New note");
    const cats = this.store.listCategories().map((c) => c.name);
    this.picked = "";
    new import_obsidian9.Setting(this.contentEl).setName("Title").addText((t) => {
      t.setPlaceholder("Note title").onChange((v) => this.title = v);
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });
    new import_obsidian9.Setting(this.contentEl).setName("Category").setDesc("Optional \u2014 file it under a category as you create it.").addDropdown((dd) => {
      dd.addOption("", "(none)");
      for (const c of cats) dd.addOption(c, c);
      dd.setValue("").onChange((v) => this.picked = v);
    });
    new import_obsidian9.Setting(this.contentEl).setName("Or a new category").setDesc("Creates the category and files this note under it.").addText((t) => t.setPlaceholder("New category name").onChange((v) => this.newCategory = v));
    new import_obsidian9.Setting(this.contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => this.close())).addButton((b) => b.setButtonText("Create").setCta().onClick(() => void this.submit()));
  }
  async submit() {
    const title = this.title.trim();
    if (!title) {
      new import_obsidian9.Notice("Please give the note a title.");
      return;
    }
    const category = this.newCategory.trim() || this.picked.trim();
    const file = await this.store.createNote(title, category || void 0);
    this.close();
    this.onDone();
    await this.app.workspace.getLeaf(false).openFile(file);
  }
  onClose() {
    this.contentEl.empty();
  }
};
var NewCategoryModal = class extends import_obsidian9.Modal {
  constructor(app, store, onDone) {
    super(app);
    this.store = store;
    this.onDone = onDone;
    this.name = "";
  }
  onOpen() {
    this.titleEl.setText("New category");
    new import_obsidian9.Setting(this.contentEl).setName("Name").addText((t) => {
      t.setPlaceholder("Category name").onChange((v) => this.name = v);
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });
    new import_obsidian9.Setting(this.contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => this.close())).addButton((b) => b.setButtonText("Create").setCta().onClick(() => void this.submit()));
  }
  async submit() {
    const name = this.name.trim();
    if (!name) {
      new import_obsidian9.Notice("Please give the category a name.");
      return;
    }
    await this.store.createCategory(name);
    this.close();
    this.onDone();
  }
  onClose() {
    this.contentEl.empty();
  }
};
function runAssignFlow(app, store, onDone) {
  const notes = store.listNotes();
  if (notes.length === 0) {
    new import_obsidian9.Notice("There are no notes to file yet. Make one first.");
    return;
  }
  new NoteSuggestModal(app, notes, (note) => {
    const cats = store.listCategories().map((c) => c.name);
    new CategoryPromptModal(app, cats, async (category) => {
      await store.assign(note, category);
      new import_obsidian9.Notice(`Filed \u201C${note.basename}\u201D under \u201C${category}\u201D.`);
      onDone();
    }).open();
  }).open();
}
var NoteSuggestModal = class extends import_obsidian9.FuzzySuggestModal {
  constructor(app, notes, onChoose) {
    super(app);
    this.notes = notes;
    this.onChoose = onChoose;
    this.setPlaceholder("Pick a note to file\u2026");
  }
  getItems() {
    return this.notes;
  }
  getItemText(file) {
    return file.basename;
  }
  onChooseItem(file) {
    this.onChoose(file);
  }
};
var CategoryPromptModal = class extends import_obsidian9.Modal {
  constructor(app, categories, onChoose) {
    super(app);
    this.categories = categories;
    this.onChoose = onChoose;
    this.picked = "";
    this.newName = "";
  }
  onOpen() {
    var _a;
    this.titleEl.setText("File under a category");
    this.picked = (_a = this.categories[0]) != null ? _a : "";
    if (this.categories.length > 0) {
      new import_obsidian9.Setting(this.contentEl).setName("Existing category").addDropdown((dd) => {
        for (const c of this.categories) dd.addOption(c, c);
        dd.setValue(this.picked).onChange((v) => this.picked = v);
      });
    }
    new import_obsidian9.Setting(this.contentEl).setName("Or a new category").setDesc("Leave blank to use the one above.").addText((t) => {
      t.setPlaceholder("New category name").onChange((v) => this.newName = v);
      if (this.categories.length === 0) t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });
    new import_obsidian9.Setting(this.contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => this.close())).addButton((b) => b.setButtonText("File it").setCta().onClick(() => this.submit()));
  }
  submit() {
    const category = this.newName.trim() || this.picked.trim();
    if (!category) {
      new import_obsidian9.Notice("Pick or name a category.");
      return;
    }
    this.close();
    this.onChoose(category);
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/panels/search.ts
var SearchPanel = class extends BasePanel {
  constructor() {
    super(...arguments);
    this.id = "search";
    this.title = "Search";
    this.index = [];
    this.selected = 0;
    this.hits = [];
  }
  buildIndex() {
    var _a;
    const roots = this.searchRoots();
    this.index = [];
    for (const file of this.ctx.app.vault.getMarkdownFiles()) {
      if (roots.length && !roots.some((r) => inFolder(file.path, r))) continue;
      const cache = this.ctx.app.metadataCache.getFileCache(file);
      const headings = ((_a = cache == null ? void 0 : cache.headings) != null ? _a : []).map((h) => h.heading);
      this.index.push({ file, basename: file.basename, headings });
    }
  }
  searchRoots() {
    return this.ctx.settings().kbSearchPaths.map((p) => p.trim().replace(/^\/+/, "").replace(/\/+$/, "")).filter(Boolean);
  }
  renderBody() {
    this.buildIndex();
    placard(this.el, "Search");
    const store = this.ctx.plugin.knowledgeBase;
    const actions = this.el.createDiv({ cls: "dash-btn-row" });
    const note = actions.createEl("button", { cls: "dash-btn dash-btn-primary", text: "+ Note" });
    note.addEventListener("click", () => new NewNoteModal(this.ctx.app, store, () => this.rerender()).open());
    const cat = actions.createEl("button", { cls: "dash-btn", text: "+ Category" });
    cat.addEventListener("click", () => new NewCategoryModal(this.ctx.app, store, () => this.rerender()).open());
    const assign2 = actions.createEl("button", { cls: "dash-btn", text: "File under category" });
    assign2.addEventListener("click", () => runAssignFlow(this.ctx.app, store, () => this.rerender()));
    const input = this.el.createEl("input", {
      cls: "dash-search-input",
      attr: { type: "search", placeholder: "Search your notes\u2026", enterkeyhint: "search" }
    });
    this.inputEl = input;
    this.bindTextFocus(input);
    this.resultsEl = this.el.createDiv({ cls: "dash-search-results" });
    input.addEventListener("input", () => this.runQuery(input.value));
    input.addEventListener("keydown", (e) => this.onKey(e));
    this.runQuery("");
    this.renderCategories();
  }
  renderCategories() {
    const store = this.ctx.plugin.knowledgeBase;
    const cats = store.listCategories();
    const section = this.el.createDiv({ cls: "dash-sb-cats" });
    section.createDiv({ cls: "dash-subhead", text: `Categories \xB7 ${cats.length}` });
    if (cats.length === 0) {
      section.createDiv({ cls: "dash-muted", text: "No categories yet. Make one to start grouping your notes." });
      return;
    }
    const listEl = section.createDiv();
    void (async () => {
      const withMembers = await Promise.all(
        cats.map(async (c) => ({ cat: c, members: await store.categoryMembers(c.file) }))
      );
      if (!listEl.isConnected) return;
      for (const { cat, members } of withMembers) {
        const details = listEl.createEl("details", { cls: "dash-sb-cat" });
        const summary = details.createEl("summary");
        summary.createSpan({ cls: "dash-sb-cat-name", text: cat.name });
        summary.createSpan({ cls: "dash-chip dash-chip-cold", text: String(members.length) });
        const body = details.createDiv({ cls: "dash-sb-cat-body" });
        if (members.length === 0) body.createDiv({ cls: "dash-muted", text: "Empty." });
        for (const m of members) {
          const row = body.createDiv({ cls: "dash-sb-member" });
          const link = row.createEl("a", { cls: "dash-sb-link", text: m });
          link.addEventListener("click", (e) => {
            e.preventDefault();
            void this.ctx.app.workspace.openLinkText(m, cat.file.path, false);
          });
        }
      }
    })();
  }
  runQuery(query) {
    const q = query.trim();
    this.hits = [];
    this.selected = 0;
    if (q) {
      const search = (0, import_obsidian10.prepareFuzzySearch)(q);
      for (const cand of this.index) {
        let best = search(cand.basename);
        let context = "";
        for (const h of cand.headings) {
          const r = search(h);
          if (r && (!best || r.score > best.score)) {
            best = r;
            context = h;
          }
        }
        if (best) this.hits.push({ file: cand.file, title: cand.basename, context, score: best.score });
      }
      this.hits.sort((a, b) => b.score - a.score);
      this.hits = this.hits.slice(0, 20);
    }
    this.renderResults();
  }
  renderResults() {
    var _a;
    const el = this.resultsEl;
    if (!el) return;
    el.empty();
    if (!((_a = this.inputEl) == null ? void 0 : _a.value.trim())) {
      const roots = this.searchRoots();
      const where = roots.length ? roots.join(", ") : "your vault";
      el.createDiv({ cls: "dash-muted", text: `${this.index.length} notes ready to search in ${where}. Start typing.` });
      return;
    }
    if (this.hits.length === 0) {
      el.createDiv({ cls: "dash-muted", text: "No matching notes." });
      return;
    }
    this.hits.forEach((hit, i) => {
      const row = el.createDiv({ cls: "dash-search-row" });
      if (i === this.selected) row.addClass("is-selected");
      row.createDiv({ cls: "dash-search-title", text: hit.title });
      if (hit.context && hit.context !== hit.title) row.createDiv({ cls: "dash-search-context", text: hit.context });
      row.addEventListener("click", () => this.open(hit.file));
    });
  }
  onKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.selected = Math.min(this.hits.length - 1, this.selected + 1);
      this.renderResults();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.selected = Math.max(0, this.selected - 1);
      this.renderResults();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = this.hits[this.selected];
      if (hit) this.open(hit.file);
    }
  }
  open(file) {
    void this.ctx.app.workspace.getLeaf(false).openFile(file);
  }
};
function inFolder(path, folder) {
  return path === folder || path.startsWith(folder + "/");
}

// src/panels/secondbrain.ts
var import_obsidian11 = require("obsidian");
var SecondBrainPanel = class extends BasePanel {
  constructor() {
    super(...arguments);
    this.id = "secondbrain";
    this.title = "Second Brain";
    this.query = "";
    this.showArchived = false;
  }
  get store() {
    return this.ctx.plugin.secondBrain;
  }
  renderBody() {
    const head = placard(this.el, "Second Brain");
    const notes = this.store.listNotes();
    head.createSpan({ cls: "dash-placard-badge", text: `${notes.length} active` });
    const actions = this.el.createDiv({ cls: "dash-btn-row" });
    const add = actions.createEl("button", { cls: "dash-btn dash-btn-primary", text: "+ New project" });
    add.addEventListener("click", () => new NewNoteModal2(this.ctx.app, this.store, () => this.rerender()).open());
    const input = this.el.createEl("input", {
      cls: "dash-search-input",
      attr: { type: "search", placeholder: "Search your projects\u2026" }
    });
    input.value = this.query;
    this.bindTextFocus(input);
    const results = this.el.createDiv({ cls: "dash-sb-results" });
    const render = () => {
      results.empty();
      const q = this.query.trim();
      const list = q ? this.fuzzy(notes, q) : notes.slice(0, 12);
      if (list.length === 0) {
        results.createDiv({
          cls: "dash-empty",
          text: q ? "No matching projects." : "No active projects yet. Tap \u201C+ New project\u201D to start one."
        });
        return;
      }
      for (const file of list) this.renderNoteRow(results, file);
      if (!q && notes.length > 12) {
        results.createDiv({ cls: "dash-muted", text: `+${notes.length - 12} more \u2014 type to search.` });
      }
    };
    input.addEventListener("input", () => {
      this.query = input.value;
      render();
    });
    render();
    const archived = this.store.listArchived();
    if (archived.length > 0) {
      const arch = this.el.createEl("details", { cls: "dash-sb-archived" });
      arch.open = this.showArchived;
      arch.createEl("summary", { text: `Archived \xB7 ${archived.length}` });
      arch.addEventListener("toggle", () => this.showArchived = arch.open);
      const list = arch.createDiv();
      for (const file of archived) {
        const row = list.createDiv({ cls: "dash-sb-member" });
        const link = row.createEl("a", { cls: "dash-sb-link", text: file.basename });
        link.addEventListener("click", (e) => {
          e.preventDefault();
          void this.ctx.app.workspace.getLeaf(false).openFile(file);
        });
        this.iconBtn(row, "\u293A", "Move back to active", async () => {
          await this.store.restoreNote(file);
          new import_obsidian11.Notice(`Moved \u201C${file.basename}\u201D back to active projects.`);
          this.rerender();
        });
      }
    }
  }
  renderNoteRow(parent, file) {
    const row = parent.createDiv({ cls: "dash-sb-row" });
    const link = row.createEl("a", { cls: "dash-sb-link", text: file.basename });
    link.addEventListener("click", (e) => {
      e.preventDefault();
      void this.ctx.app.workspace.getLeaf(false).openFile(file);
    });
    this.iconBtn(row, "\u{1F5C4}", "Archive (project finished)", () => {
      new ConfirmModal(
        this.ctx.app,
        `Archive \u201C${file.basename}\u201D?`,
        "It moves into your Archive folder. Any links to it are updated automatically, and you can move it back any time.",
        "Archive",
        async () => {
          await this.store.archiveNote(file);
          new import_obsidian11.Notice(`Archived \u201C${file.basename}\u201D.`);
          this.showArchived = true;
          this.rerender();
        }
      ).open();
    });
    this.iconBtn(row, "\u{1F5D1}", "Delete", () => {
      new ConfirmModal(
        this.ctx.app,
        `Delete \u201C${file.basename}\u201D?`,
        "It goes to your configured trash. This can't be undone from here.",
        "Delete",
        async () => {
          await this.store.deleteNote(file);
          new import_obsidian11.Notice(`Deleted \u201C${file.basename}\u201D.`);
          this.rerender();
        }
      ).open();
    });
  }
  iconBtn(parent, glyph, label, onClick) {
    const b = parent.createEl("button", { cls: "dash-icon-btn dash-sb-icon", text: glyph, attr: { title: label, "aria-label": label } });
    b.addEventListener("click", onClick);
  }
  fuzzy(files, query) {
    var _a;
    const search = (0, import_obsidian11.prepareFuzzySearch)(query);
    const scored = [];
    for (const file of files) {
      let best = search(file.basename);
      const cache = this.ctx.app.metadataCache.getFileCache(file);
      for (const h of (_a = cache == null ? void 0 : cache.headings) != null ? _a : []) {
        const r = search(h.heading);
        if (r && (!best || r.score > best.score)) best = r;
      }
      if (best) scored.push({ file, score: best.score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 20).map((s) => s.file);
  }
};
var NewNoteModal2 = class extends import_obsidian11.Modal {
  constructor(app, store, onDone) {
    super(app);
    this.store = store;
    this.onDone = onDone;
    this.title = "";
  }
  onOpen() {
    this.titleEl.setText("New project");
    new import_obsidian11.Setting(this.contentEl).setName("Project name").addText((t) => {
      t.setPlaceholder("What is this project called?").onChange((v) => this.title = v);
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });
    new import_obsidian11.Setting(this.contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => this.close())).addButton((b) => b.setButtonText("Create").setCta().onClick(() => void this.submit()));
  }
  async submit() {
    const title = this.title.trim();
    if (!title) {
      new import_obsidian11.Notice("Please give the project a name.");
      return;
    }
    const file = await this.store.createNote(title);
    this.close();
    this.onDone();
    await this.app.workspace.getLeaf(false).openFile(file);
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ConfirmModal = class extends import_obsidian11.Modal {
  constructor(app, heading, body, confirmLabel, onConfirm) {
    super(app);
    this.heading = heading;
    this.body = body;
    this.confirmLabel = confirmLabel;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.titleEl.setText(this.heading);
    this.contentEl.createEl("p", { text: this.body });
    new import_obsidian11.Setting(this.contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => this.close())).addButton(
      (b) => b.setButtonText(this.confirmLabel).setWarning().onClick(() => {
        this.close();
        this.onConfirm();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/panels/calendar.ts
var import_obsidian13 = require("obsidian");

// src/core/dailynotes.ts
var import_obsidian12 = require("obsidian");
var DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;
function inFolder2(path, folder) {
  return path === folder || path.startsWith(folder + "/");
}
function listDailyNoteFiles(app) {
  const folder = dailyNotesFolder(app);
  return app.vault.getMarkdownFiles().filter((f) => {
    if (folder) return inFolder2(f.path, folder);
    return DATE_LIKE.test(f.basename);
  });
}
async function searchDailyNoteBodies(app, query, limit = 30) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const files = listDailyNoteFiles(app).sort((a, b) => b.stat.mtime - a.stat.mtime);
  const out = [];
  for (const file of files) {
    let content;
    try {
      content = await app.vault.cachedRead(file);
    } catch (e) {
      continue;
    }
    const body = content.split("\n").filter((l) => !/^#{1,6}\s/.test(l)).join("\n");
    const idx = body.toLowerCase().indexOf(q);
    if (idx !== -1) {
      out.push({ file, snippet: makeSnippet(body, idx, q.length) });
      if (out.length >= limit) break;
    }
  }
  return out;
}
function makeSnippet(body, idx, len) {
  const pad = 48;
  const start = Math.max(0, idx - pad);
  const end = Math.min(body.length, idx + len + pad);
  let s = body.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) s = "\u2026 " + s;
  if (end < body.length) s = s + " \u2026";
  return s;
}
async function ensureDailyNotesBase(app, basePath) {
  const path = (0, import_obsidian12.normalizePath)(basePath.endsWith(".base") ? basePath : basePath + ".base");
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian12.TFile) return existing;
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir && !app.vault.getAbstractFileByPath(dir)) {
    await app.vault.createFolder(dir).catch(() => {
    });
  }
  const folder = dailyNotesFolder(app);
  return app.vault.create(path, baseContent(folder));
}
function baseContent(folder) {
  const filter = folder ? `    - file.inFolder("${folder}")` : `    - file.ext == "md"`;
  return [
    "filters:",
    "  and:",
    filter,
    "views:",
    "  - type: table",
    "    name: Daily notes",
    "    order:",
    "      - file.name",
    "      - file.mtime",
    ""
  ].join("\n");
}

// src/panels/calendar.ts
var WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
var CalendarPanel = class extends BasePanel {
  constructor() {
    super(...arguments);
    this.id = "calendar";
    this.title = "Calendar";
    /** First day of the month being viewed. */
    this.cursor = startOfMonth(/* @__PURE__ */ new Date());
    this.searchQuery = "";
    this.searchTimer = null;
  }
  renderBody() {
    placard(this.el, "Calendar");
    this.renderMonthNav();
    this.renderGrid();
    this.renderBaseButton();
    this.renderSearch();
  }
  // ------------------------------------------------------------- month grid
  renderMonthNav() {
    const nav = this.el.createDiv({ cls: "dash-cal-nav" });
    const prev = nav.createEl("button", { cls: "dash-icon-btn", text: "\u2039", attr: { "aria-label": "Previous month" } });
    prev.addEventListener("click", () => {
      this.cursor = addMonths(this.cursor, -1);
      this.rerender();
    });
    const label = nav.createSpan({ cls: "dash-cal-month", text: (0, import_obsidian13.moment)(this.cursor).format("MMMM YYYY") });
    label.addEventListener("click", () => {
      this.cursor = startOfMonth(/* @__PURE__ */ new Date());
      this.rerender();
    });
    const next = nav.createEl("button", { cls: "dash-icon-btn", text: "\u203A", attr: { "aria-label": "Next month" } });
    next.addEventListener("click", () => {
      this.cursor = addMonths(this.cursor, 1);
      this.rerender();
    });
  }
  renderGrid() {
    const grid = this.el.createDiv({ cls: "dash-cal-grid" });
    for (const w of WEEKDAY_LABELS) grid.createDiv({ cls: "dash-cal-dow", text: w });
    const year = this.cursor.getFullYear();
    const month = this.cursor.getMonth();
    const first = new Date(year, month, 1);
    const leading = first.getDay();
    const start = new Date(year, month, 1 - leading);
    const todayStr2 = (0, import_obsidian13.moment)().format("YYYY-MM-DD");
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dateStr = fmt(d);
      const cell = grid.createEl("button", { cls: "dash-cal-day", text: String(d.getDate()) });
      if (d.getMonth() !== month) cell.addClass("is-outside");
      if (dateStr === todayStr2) cell.addClass("is-today");
      if (getDailyNoteFile(this.ctx.app, dateStr)) cell.addClass("has-note");
      cell.setAttr("aria-label", (0, import_obsidian13.moment)(d).format("dddd, MMMM D, YYYY"));
      cell.addEventListener("click", () => void this.openDay(dateStr));
    }
  }
  async openDay(dateStr) {
    try {
      const file = await ensureDailyNote(this.ctx.app, dateStr);
      await this.ctx.app.workspace.getLeaf(false).openFile(file);
    } catch (e) {
      console.error("Daily Dashboard: could not open the daily note", e);
      new import_obsidian13.Notice("Couldn't open that day's note.");
    }
  }
  // -------------------------------------------------------------- base button
  renderBaseButton() {
    const row = this.el.createDiv({ cls: "dash-btn-row" });
    const btn = row.createEl("button", { cls: "dash-btn", text: "Open all-days table" });
    btn.addEventListener("click", async () => {
      try {
        const path = this.ctx.settings().calendarBasePath;
        const file = await ensureDailyNotesBase(this.ctx.app, path);
        await this.ctx.app.workspace.getLeaf(false).openFile(file);
      } catch (e) {
        console.error("Daily Dashboard: could not open the daily-notes base", e);
        new import_obsidian13.Notice("Couldn't open the daily-notes table. Check the base file path in settings.");
      }
    });
  }
  // ------------------------------------------------------------------ search
  renderSearch() {
    this.el.createDiv({ cls: "dash-subhead", text: "Search all daily notes" });
    const input = this.el.createEl("input", {
      cls: "dash-search-input",
      attr: { type: "search", placeholder: "Find words inside your daily notes\u2026", enterkeyhint: "search" }
    });
    input.value = this.searchQuery;
    this.bindTextFocus(input);
    this.searchResultsEl = this.el.createDiv({ cls: "dash-search-results" });
    input.addEventListener("input", () => {
      this.searchQuery = input.value;
      if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
      this.searchTimer = window.setTimeout(() => void this.runSearch(), 250);
    });
    this.onCleanup(() => {
      if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
    });
    if (this.searchQuery.trim()) void this.runSearch();
  }
  async runSearch() {
    const el = this.searchResultsEl;
    if (!el) return;
    const q = this.searchQuery.trim();
    el.empty();
    if (!q) return;
    const hits = await searchDailyNoteBodies(this.ctx.app, q);
    if (!el.isConnected) return;
    if (hits.length === 0) {
      el.createDiv({ cls: "dash-muted", text: "Nothing found in your daily notes." });
      return;
    }
    for (const hit of hits) this.renderHit(el, hit);
  }
  renderHit(el, hit) {
    const row = el.createDiv({ cls: "dash-search-row" });
    row.createDiv({ cls: "dash-search-title", text: hit.file.basename });
    row.createDiv({ cls: "dash-search-context", text: hit.snippet });
    row.addEventListener("click", () => this.open(hit.file));
  }
  open(file) {
    void this.ctx.app.workspace.getLeaf(false).openFile(file);
  }
};
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d, delta) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}
function fmt(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// src/panels/places.ts
var PlacesPanel = class extends BasePanel {
  constructor() {
    super(...arguments);
    this.id = "places";
    this.title = "Places";
  }
  renderBody() {
    placard(this.el, "Places");
    const grid = this.el.createDiv({ cls: "dash-places" });
    const places = this.ctx.settings().places;
    if (places.length === 0) {
      grid.createDiv({ cls: "dash-empty", text: "No places yet. Add shortcuts to your favourite notes and folders in the plugin settings." });
      return;
    }
    for (const place of places) {
      if (place.type === "command") {
        commandButton(grid, this.ctx.bridge, place.target, place.label, { cls: "dash-place-btn" });
      } else {
        const btn = grid.createEl("button", { cls: "dash-btn dash-place-btn", text: place.label });
        btn.addEventListener("click", () => {
          void this.ctx.app.workspace.openLinkText(place.target, "", false);
        });
      }
    }
  }
};

// src/panels/registry.ts
var PANEL_ORDER = [
  "clock",
  "verse",
  "todo",
  "agenda",
  "journal",
  "meals",
  "search",
  "calendar",
  "secondbrain",
  "places"
];
var PANEL_TITLES = {
  clock: "Clock",
  verse: "Verse of the Day",
  todo: "To-do",
  agenda: "Today's Agenda",
  journal: "Journal",
  meals: "Meals",
  search: "Search",
  calendar: "Calendar",
  secondbrain: "Second Brain",
  places: "Places"
};
var FACTORIES = {
  clock: () => new ClockPanel(),
  verse: () => new VersePanel(),
  todo: () => new TodoPanel(),
  agenda: () => new AgendaPanel(),
  journal: () => new JournalPanel(),
  meals: () => new MealsPanel(),
  search: () => new SearchPanel(),
  calendar: () => new CalendarPanel(),
  secondbrain: () => new SecondBrainPanel(),
  places: () => new PlacesPanel()
};
function createPanels(order, enabled) {
  const seen = /* @__PURE__ */ new Set();
  const panels = [];
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (enabled[id] === false) continue;
    const factory = FACTORIES[id];
    if (factory) panels.push(factory());
  }
  return panels;
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  theme: DEFAULT_THEME,
  openOnStartup: false,
  replaceNewTab: false,
  panelOrder: [...PANEL_ORDER],
  enabledPanels: Object.fromEntries(PANEL_ORDER.map((id) => [id, true])),
  clock24h: false,
  agendaRefreshMinutes: 30,
  agendaHeight: 320,
  agendaUrls: [],
  kbSearchPaths: ["Knowledge base/Notes", "Second brain"],
  kbRootPath: "Knowledge base",
  kbNotesSubfolder: "Notes",
  kbCategoriesSubfolder: "Categories",
  kbArchiveSubfolder: "Archive",
  kbListHeading: "Notes",
  secondBrainPath: "Second brain",
  secondBrainArchiveSubfolder: "Archive",
  calendarBasePath: "Logs/Daily notes.base",
  places: [
    { label: "Knowledge base", target: "Knowledge base", type: "note" },
    { label: "Second brain", target: "Second brain", type: "note" },
    { label: "Today's note", target: "daily-notes", type: "command" },
    { label: "Recipe index", target: "recipe-manager:recipe-index", type: "command" }
  ],
  directivesPath: "Daily Dashboard/To-dos.md",
  completedTasksMarker: "",
  completedTasksHeading: "Completed tasks"
};
function normalizePlace(p) {
  if (p.type === "note" && p.target.startsWith("cmd:")) {
    return { label: p.label, target: p.target.slice(4), type: "command" };
  }
  return { ...p };
}
function mergeSettings(loaded) {
  var _a, _b, _c, _d, _e;
  const s = { ...DEFAULT_SETTINGS, ...loaded != null ? loaded : {} };
  if (!isThemeId(s.theme)) s.theme = DEFAULT_THEME;
  const order = ((_a = loaded == null ? void 0 : loaded.panelOrder) != null ? _a : []).filter((id) => PANEL_ORDER.includes(id));
  for (const id of PANEL_ORDER) if (!order.includes(id)) order.push(id);
  s.panelOrder = order;
  s.enabledPanels = { ...DEFAULT_SETTINGS.enabledPanels, ...(_b = loaded == null ? void 0 : loaded.enabledPanels) != null ? _b : {} };
  s.agendaUrls = ((_c = loaded == null ? void 0 : loaded.agendaUrls) != null ? _c : DEFAULT_SETTINGS.agendaUrls).map((c) => ({ ...c }));
  s.kbSearchPaths = ((_d = loaded == null ? void 0 : loaded.kbSearchPaths) != null ? _d : DEFAULT_SETTINGS.kbSearchPaths).slice();
  s.places = ((_e = loaded == null ? void 0 : loaded.places) != null ? _e : DEFAULT_SETTINGS.places).map(normalizePlace);
  return s;
}
var DashSettingTab = class extends import_obsidian14.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  async save() {
    await this.plugin.saveData_();
    this.plugin.refreshOpenViews();
  }
  /** Persist and re-mount open views — for panel enable/reorder changes. */
  async saveLayout() {
    await this.plugin.saveData_();
    this.plugin.rebuildOpenViews();
  }
  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();
    new import_obsidian14.Setting(containerEl).setName("Appearance").setHeading();
    new import_obsidian14.Setting(containerEl).setName("Theme").setDesc(`${this.themeBlurb(s.theme)} Each theme follows your Obsidian light/dark setting automatically.`).addDropdown((dd) => {
      for (const t of THEMES) dd.addOption(t.id, t.label);
      dd.setValue(s.theme).onChange(async (v) => {
        s.theme = isThemeId(v) ? v : DEFAULT_THEME;
        await this.plugin.saveData_();
        this.plugin.applyThemeToViews();
        this.display();
      });
    });
    new import_obsidian14.Setting(containerEl).setName("Open on startup").setDesc("Open the dashboard automatically when Obsidian starts.").addToggle(
      (t) => t.setValue(s.openOnStartup).onChange(async (v) => {
        s.openOnStartup = v;
        await this.save();
      })
    );
    new import_obsidian14.Setting(containerEl).setName("Use as the New Tab page").setDesc("Turn every empty New Tab into the dashboard, so it becomes your landing view.").addToggle(
      (t) => t.setValue(s.replaceNewTab).onChange(async (v) => {
        s.replaceNewTab = v;
        await this.save();
        if (v) this.plugin.replaceActiveEmptyLeaf();
      })
    );
    new import_obsidian14.Setting(containerEl).setName("24-hour clock").setDesc("Off shows the time as 2:32 PM. On shows it as 14:32.").addToggle(
      (t) => t.setValue(s.clock24h).onChange(async (v) => {
        s.clock24h = v;
        await this.save();
      })
    );
    new import_obsidian14.Setting(containerEl).setName("Panels").setDesc("Turn panels on or off, and reorder them. Everything is on by default; the layout stacks to one column on a phone and spreads to a grid on the desktop.").setHeading();
    const list = containerEl.createDiv({ cls: "dash-settings-panel-list" });
    const renderList = () => {
      list.empty();
      s.panelOrder.forEach((id, index) => {
        var _a;
        const row = new import_obsidian14.Setting(list).setName((_a = PANEL_TITLES[id]) != null ? _a : id);
        row.addExtraButton(
          (b) => b.setIcon("arrow-up").setTooltip("Move up").setDisabled(index === 0).onClick(async () => {
            [s.panelOrder[index - 1], s.panelOrder[index]] = [s.panelOrder[index], s.panelOrder[index - 1]];
            await this.saveLayout();
            renderList();
          })
        );
        row.addExtraButton(
          (b) => b.setIcon("arrow-down").setTooltip("Move down").setDisabled(index === s.panelOrder.length - 1).onClick(async () => {
            [s.panelOrder[index + 1], s.panelOrder[index]] = [s.panelOrder[index], s.panelOrder[index + 1]];
            await this.saveLayout();
            renderList();
          })
        );
        row.addToggle(
          (t) => t.setValue(s.enabledPanels[id] !== false).onChange(async (v) => {
            s.enabledPanels[id] = v;
            await this.saveLayout();
          })
        );
      });
    };
    renderList();
    new import_obsidian14.Setting(containerEl).setName("Today's agenda").setHeading();
    new import_obsidian14.Setting(containerEl).setName("Refresh interval (minutes)").setDesc("How often your calendars are re-fetched while the dashboard is open.").addText(
      (t) => t.setValue(String(s.agendaRefreshMinutes)).onChange(async (v) => {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) {
          s.agendaRefreshMinutes = n;
          await this.save();
        }
      })
    );
    new import_obsidian14.Setting(containerEl).setName("Agenda height (pixels)").setDesc("The agenda scrolls inside a fixed height so it never takes over the screen. This sets that height.").addText(
      (t) => t.setValue(String(s.agendaHeight)).onChange(async (v) => {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 120) {
          s.agendaHeight = Math.round(n);
          await this.save();
        }
      })
    );
    new import_obsidian14.Setting(containerEl).setName("Calendar share links").setDesc("Up to 20 calendars. One per line, as `Label | https://\u2026` (a public Proton Calendar / ICS share link). Today only \u2014 there is no month view.").addTextArea((t) => {
      t.setValue(s.agendaUrls.map((c) => `${c.label} | ${c.url}`).join("\n"));
      t.inputEl.rows = 8;
      t.onChange(async (v) => {
        s.agendaUrls = v.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 20).map((line) => {
          const bar = line.indexOf("|");
          if (bar === -1) return { label: "Calendar", url: line };
          return { label: line.slice(0, bar).trim() || "Calendar", url: line.slice(bar + 1).trim() };
        });
        await this.save();
      });
    });
    new import_obsidian14.Setting(containerEl).setName("Search").setHeading();
    new import_obsidian14.Setting(containerEl).setName("Folders to search").setDesc("The knowledge-base search looks only inside these folders. One folder per line.").addTextArea((t) => {
      t.setValue(s.kbSearchPaths.join("\n"));
      t.inputEl.rows = 3;
      t.onChange(async (v) => {
        const paths = v.split("\n").map((l) => l.trim()).filter(Boolean);
        s.kbSearchPaths = paths.length ? paths : [...DEFAULT_SETTINGS.kbSearchPaths];
        await this.save();
      });
    });
    this.addText(containerEl, "Knowledge base folder", "The folder the Search card creates notes and categories in.", s.kbRootPath, (v) => s.kbRootPath = v || "Knowledge base");
    this.addText(containerEl, "Notes subfolder", "Where new notes go, inside the knowledge-base folder.", s.kbNotesSubfolder, (v) => s.kbNotesSubfolder = v, true);
    this.addText(containerEl, "Categories subfolder", "Where category notes go, inside the knowledge-base folder.", s.kbCategoriesSubfolder, (v) => s.kbCategoriesSubfolder = v || "Categories");
    this.addText(containerEl, "Category list heading", "The heading in a category note under which its notes are listed.", s.kbListHeading, (v) => s.kbListHeading = v || "Notes");
    new import_obsidian14.Setting(containerEl).setName("Calendar").setHeading();
    this.addText(
      containerEl,
      "Daily-notes base file",
      "The Bases (.base) file the Calendar card's button opens. It's created for you the first time you press the button if it doesn't exist yet.",
      s.calendarBasePath,
      (v) => s.calendarBasePath = v || "Logs/Daily notes.base"
    );
    new import_obsidian14.Setting(containerEl).setName("Second brain").setHeading();
    this.addText(containerEl, "Second brain folder", "The ongoing-project folder the Second brain panel manages.", s.secondBrainPath, (v) => s.secondBrainPath = v || "Second brain");
    this.addText(containerEl, "Archive subfolder", "Where a completed project is moved, inside the Second brain folder.", s.secondBrainArchiveSubfolder, (v) => s.secondBrainArchiveSubfolder = v || "Archive");
    new import_obsidian14.Setting(containerEl).setName("Places / navigation").setHeading();
    new import_obsidian14.Setting(containerEl).setName("Destinations").setDesc("One per line as `Label | target`. A target is a note or folder name (e.g. `Knowledge base`) or, prefixed with `cmd:`, a command id (e.g. `cmd:recipe-manager:recipe-index`).").addTextArea((t) => {
      t.setValue(
        s.places.map((p) => `${p.label} | ${p.type === "command" ? "cmd:" + p.target : p.target}`).join("\n")
      );
      t.inputEl.rows = 6;
      t.onChange(async (v) => {
        s.places = v.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
          const bar = line.indexOf("|");
          const label = bar === -1 ? line : line.slice(0, bar).trim();
          let target = bar === -1 ? line : line.slice(bar + 1).trim();
          const type = target.startsWith("cmd:") ? "command" : "note";
          if (type === "command") target = target.slice(4).trim();
          return { label, target, type };
        });
        await this.save();
      });
    });
    new import_obsidian14.Setting(containerEl).setName("To-dos").setHeading();
    this.addText(
      containerEl,
      "To-do list file",
      "The Markdown file your to-do list is saved in. Markdown always syncs via Obsidian Sync, so the list follows you across devices. Any extension you type becomes .md.",
      s.directivesPath,
      (v) => s.directivesPath = v || "Daily Dashboard/To-dos.md"
    );
    this.addText(containerEl, "Completed-tasks heading", "Completed to-dos are logged under this heading in today's note.", s.completedTasksHeading, (v) => s.completedTasksHeading = v || "Completed tasks");
    this.addText(containerEl, "Completed-tasks marker", "Optional. If set, completed tasks go after this marker instead of the heading.", s.completedTasksMarker, (v) => s.completedTasksMarker = v, true);
  }
  themeBlurb(id) {
    var _a, _b;
    return (_b = (_a = THEMES.find((t) => t.id === id)) == null ? void 0 : _a.blurb) != null ? _b : "";
  }
  addText(el, name, desc, value, set, allowEmpty = false) {
    new import_obsidian14.Setting(el).setName(name).setDesc(desc).addText(
      (t) => t.setValue(value).onChange(async (v) => {
        const trimmed = v.trim();
        if (!trimmed && !allowEmpty) return;
        set(trimmed);
        await this.save();
      })
    );
  }
};

// src/core/bridge.ts
var import_obsidian15 = require("obsidian");
var RECIPES_ID = "recipe-manager";
var Bridge = class {
  constructor(app) {
    this.app = app;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugin(id) {
    var _a, _b;
    return (_b = (_a = this.app.plugins) == null ? void 0 : _a.plugins) == null ? void 0 : _b[id];
  }
  enabled(id) {
    var _a, _b, _c;
    return !!((_c = (_b = (_a = this.app.plugins) == null ? void 0 : _a.enabledPlugins) == null ? void 0 : _b.has) == null ? void 0 : _c.call(_b, id)) || !!this.plugin(id);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api(id) {
    var _a;
    const api = (_a = this.plugin(id)) == null ? void 0 : _a.api;
    return api && typeof api.version === "number" ? api : null;
  }
  commandExists(fullId) {
    var _a, _b;
    const commands = (_b = (_a = this.app.commands) == null ? void 0 : _a.commands) != null ? _b : {};
    return !!commands[fullId];
  }
  runCommand(fullId) {
    var _a, _b;
    (_b = (_a = this.app.commands) == null ? void 0 : _a.executeCommandById) == null ? void 0 : _b.call(_a, fullId);
  }
  // ------------------------------------------------------------- Recipes
  recipesAvailable() {
    return this.enabled(RECIPES_ID);
  }
  recipeSetting(key, fallback) {
    var _a, _b;
    const v = (_b = (_a = this.plugin(RECIPES_ID)) == null ? void 0 : _a.settings) == null ? void 0 : _b[key];
    return typeof v === "string" && v.trim() ? v.trim() : fallback;
  }
  async plannedMeals(date = today()) {
    var _a, _b;
    const api = this.api(RECIPES_ID);
    if (api == null ? void 0 : api.getPlannedMeals) {
      try {
        const res = api.getPlannedMeals(date);
        const meals2 = (_a = res && typeof res.then === "function" ? await res : res) != null ? _a : [];
        return meals2.map((m) => {
          var _a2, _b2, _c, _d, _e;
          return {
            name: (_b2 = (_a2 = m.name) != null ? _a2 : m.basename) != null ? _b2 : "",
            link: (_e = (_d = (_c = m.link) != null ? _c : m.basename) != null ? _d : m.name) != null ? _e : ""
          };
        });
      } catch (e) {
        console.error("Daily Dashboard: recipes api read failed, falling back", e);
      }
    }
    const raw = await readDailyNoteRaw(this.app, date);
    const heading = this.recipeSetting("mealHeading", "Meals");
    const body = readHeadingSection(raw, heading);
    const meals = [];
    for (const line of body.split("\n")) {
      const m = line.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      if (m) meals.push({ name: ((_b = m[2]) != null ? _b : m[1]).trim(), link: m[1].trim() });
    }
    return meals;
  }
  /** The grocery-list path — read from Recipe Manager's own setting, never
   * hardcoded. */
  groceryListPath() {
    let path = this.recipeSetting("groceryListPath", "Grocery List.md");
    if (!path.toLowerCase().endsWith(".md")) path += ".md";
    return path;
  }
  /** Read the grocery list (read-only). The checkboxes reflect the file's
   * current state; editing happens in Recipe Manager or the note itself. */
  async groceryList() {
    const path = this.groceryListPath();
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian15.TFile)) return { path, items: [], exists: false };
    const content = await this.app.vault.cachedRead(file);
    const items = [];
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (m) items.push({ name: stripFormatting(m[2]), checked: m[1].toLowerCase() === "x" });
    }
    return { path, items, exists: true };
  }
};
function today() {
  return (0, import_obsidian15.moment)().format("YYYY-MM-DD");
}
function stripFormatting(s) {
  return s.replace(/\*\*/g, "").replace(/\*(?!\*)/g, "").replace(/\s+\*\([^)]*\)\s*$/, "").trim();
}

// src/core/directivesstore.ts
var import_obsidian16 = require("obsidian");
var DEFAULT_PATH = "Daily Dashboard/To-dos.md";
var HEADER = "%% Daily Dashboard \u2014 your saved to-do list. This file is managed automatically; add and edit your to-dos in the dashboard, not here. %%";
var DirectivesStore = class {
  constructor(app, getPath) {
    this.app = app;
    this.getPath = getPath;
    this.items = [];
    /** The exact text we last read from / wrote to disk, so a modify event
     * caused by our own write reloads to identical content and is ignored. */
    this.lastSerialized = "";
  }
  getItems() {
    return this.items;
  }
  setItems(items) {
    this.items = items;
  }
  /** The Markdown file the list lives in. Any configured extension is coerced
   * to `.md` so the file always syncs. */
  path() {
    const raw = (this.getPath() || DEFAULT_PATH).trim();
    return (0, import_obsidian16.normalizePath)(raw.replace(/\.[^./]+$/, "") + ".md");
  }
  isDirectivesPath(path) {
    return (0, import_obsidian16.normalizePath)(path) === this.path();
  }
  /** Load from the Markdown file. Returns true if the file existed. */
  async load() {
    const file = this.app.vault.getAbstractFileByPath(this.path());
    if (!(file instanceof import_obsidian16.TFile)) return false;
    try {
      const raw = await this.app.vault.read(file);
      this.lastSerialized = raw;
      this.items = parseTodos(raw);
    } catch (e) {
      console.error("Daily Dashboard: could not read the to-do file", e);
    }
    return true;
  }
  /** Write the current list to the Markdown file (creating it and its folder if
   * needed). No-op when the content is unchanged. */
  async save() {
    const body = buildMarkdown(this.items);
    if (body === this.lastSerialized) return;
    this.lastSerialized = body;
    const path = this.path();
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof import_obsidian16.TFile) {
      await this.app.vault.modify(existing, body);
    } else {
      await this.ensureFolder(path);
      await this.app.vault.create(path, body);
    }
  }
  /** React to a vault change on the to-do file (e.g. Obsidian Sync landing the
   * other device's edit). Returns true if the in-memory list actually changed —
   * our own writes reload to identical content and return false. */
  async onExternalChange(path) {
    if (!this.isDirectivesPath(path)) return false;
    const before = this.lastSerialized;
    await this.load();
    return this.lastSerialized !== before;
  }
  async ensureFolder(path) {
    const dir = path.split("/").slice(0, -1).join("/");
    if (!dir) return;
    if (this.app.vault.getAbstractFileByPath(dir) instanceof import_obsidian16.TFolder) return;
    await this.app.vault.createFolder(dir).catch(() => {
    });
  }
};
function buildMarkdown(items) {
  const json = JSON.stringify({ version: 1, todos: items }, null, 2);
  return `${HEADER}

\`\`\`json
${json}
\`\`\`
`;
}
function parseTodos(raw) {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  try {
    const parsed = JSON.parse(candidate);
    return Array.isArray(parsed == null ? void 0 : parsed.todos) ? parsed.todos : [];
  } catch (e) {
    return [];
  }
}

// src/core/library.ts
var import_obsidian17 = require("obsidian");
var LibraryStore = class {
  constructor(app, cfg) {
    this.app = app;
    this.cfg = cfg;
  }
  root() {
    return (0, import_obsidian17.normalizePath)((this.cfg().root || "Library").replace(/\/+$/, ""));
  }
  /** Folder new/active notes live in. */
  notesFolder() {
    var _a;
    const sub = ((_a = this.cfg().notesSubfolder) != null ? _a : "").trim().replace(/\/+$/, "");
    return sub ? (0, import_obsidian17.normalizePath)(this.root() + "/" + sub) : this.root();
  }
  categoriesFolder() {
    return (0, import_obsidian17.normalizePath)(this.root() + "/" + (this.cfg().categoriesSubfolder || "Categories"));
  }
  archiveFolder() {
    return (0, import_obsidian17.normalizePath)(this.root() + "/" + (this.cfg().archiveSubfolder || "Archive"));
  }
  heading() {
    return (this.cfg().listHeading || "Notes").trim();
  }
  inFolder(file, folder) {
    return file.path === folder || file.path.startsWith(folder + "/");
  }
  /** Active notes. With a notes subfolder, that folder's notes; otherwise
   * everything under the root except the Archive and Categories subfolders. */
  listNotes() {
    var _a;
    const sub = ((_a = this.cfg().notesSubfolder) != null ? _a : "").trim();
    const files = this.app.vault.getMarkdownFiles();
    let active;
    if (sub) {
      const notes = this.notesFolder();
      active = files.filter((f) => this.inFolder(f, notes));
    } else {
      const root = this.root();
      const cats = this.categoriesFolder();
      const arch = this.archiveFolder();
      active = files.filter(
        (f) => this.inFolder(f, root) && !this.inFolder(f, cats) && !this.inFolder(f, arch)
      );
    }
    return active.sort((a, b) => a.basename.localeCompare(b.basename));
  }
  listArchived() {
    const arch = this.archiveFolder();
    return this.app.vault.getMarkdownFiles().filter((f) => this.inFolder(f, arch)).sort((a, b) => a.basename.localeCompare(b.basename));
  }
  listCategories() {
    const cats = this.categoriesFolder();
    return this.app.vault.getMarkdownFiles().filter((f) => this.inFolder(f, cats)).map((file) => ({ name: file.basename, file, members: [] })).sort((a, b) => a.name.localeCompare(b.name));
  }
  async categoryMembers(file) {
    const content = await this.app.vault.cachedRead(file);
    return this.parseMembers(content);
  }
  // ----------------------------------------------------------- mutations
  async ensureFolder(path) {
    const norm = (0, import_obsidian17.normalizePath)(path);
    if (!norm || norm === "/") return;
    if (this.app.vault.getAbstractFileByPath(norm) instanceof import_obsidian17.TFolder) return;
    const parts = norm.split("/");
    let cur = "";
    for (const p of parts) {
      cur = cur ? cur + "/" + p : p;
      if (!(this.app.vault.getAbstractFileByPath(cur) instanceof import_obsidian17.TFolder)) {
        await this.app.vault.createFolder(cur).catch(() => {
        });
      }
    }
  }
  sanitize(name) {
    return name.replace(/[\\/:*?"<>|#^[\]]/g, "-").trim();
  }
  uniquePath(folder, base) {
    let name = base;
    for (let i = 1; i < 1e3; i++) {
      const path = (0, import_obsidian17.normalizePath)(`${folder}/${name}.md`);
      if (!this.app.vault.getAbstractFileByPath(path)) return path;
      name = `${base} ${i + 1}`;
    }
    return (0, import_obsidian17.normalizePath)(`${folder}/${base} ${Date.now()}.md`);
  }
  /** Create a category note (with the list heading) if it doesn't exist. */
  async createCategory(name) {
    const clean = this.sanitize(name);
    await this.ensureFolder(this.categoriesFolder());
    const existing = this.app.vault.getAbstractFileByPath(
      (0, import_obsidian17.normalizePath)(`${this.categoriesFolder()}/${clean}.md`)
    );
    if (existing instanceof import_obsidian17.TFile) return existing;
    const body = `---
type: category
---

# ${clean}

## ${this.heading()}
`;
    const path = this.uniquePath(this.categoriesFolder(), clean);
    return this.app.vault.create(path, body);
  }
  /** Create a note in the notes folder, optionally assigning a category. The
   * note starts empty — the filename is the title; we don't inject a duplicate
   * H1 heading. */
  async createNote(title, category) {
    const clean = this.sanitize(title);
    await this.ensureFolder(this.notesFolder());
    const path = this.uniquePath(this.notesFolder(), clean);
    const file = await this.app.vault.create(path, "");
    if (category) await this.assign(file, category);
    return file;
  }
  /** Delete a note (to the user's configured trash) and delink it from every
   * category. */
  async deleteNote(file) {
    for (const cat of this.listCategories()) {
      await this.removeMember(cat.file, file.basename);
    }
    const fm = this.app.fileManager;
    if (typeof fm.trashFile === "function") await fm.trashFile(file);
    else await this.app.vault.trash(file, true);
  }
  /** Assign `file` to `category`: write the frontmatter entry AND the
   * alphabetized wikilink in the category note (creating it if needed). */
  async assign(file, category) {
    const catFile = await this.createCategory(category);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      const list = Array.isArray(fm.categories) ? fm.categories.map(String) : fm.categories ? [String(fm.categories)] : [];
      if (!list.includes(catFile.basename)) list.push(catFile.basename);
      fm.categories = list;
    });
    await this.addMember(catFile, file.basename);
  }
  async unassign(file, category) {
    const catFile = this.app.vault.getAbstractFileByPath(
      (0, import_obsidian17.normalizePath)(`${this.categoriesFolder()}/${this.sanitize(category)}.md`)
    );
    if (catFile instanceof import_obsidian17.TFile) await this.removeMember(catFile, file.basename);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      if (Array.isArray(fm.categories)) {
        fm.categories = fm.categories.map(String).filter((c) => c !== category);
      } else if (fm.categories === category) {
        delete fm.categories;
      }
    });
  }
  /** Archive a note: remove it from every category list, then move it into the
   * Archive subfolder (inbound links elsewhere are repointed by Obsidian). */
  async archiveNote(file) {
    for (const cat of this.listCategories()) {
      await this.removeMember(cat.file, file.basename);
    }
    await this.ensureFolder(this.archiveFolder());
    let dest = (0, import_obsidian17.normalizePath)(`${this.archiveFolder()}/${file.name}`);
    if (this.app.vault.getAbstractFileByPath(dest)) {
      dest = this.uniquePath(this.archiveFolder(), file.basename);
    }
    await this.app.fileManager.renameFile(file, dest);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.archived = true;
    });
  }
  async restoreNote(file) {
    await this.ensureFolder(this.notesFolder());
    let dest = (0, import_obsidian17.normalizePath)(`${this.notesFolder()}/${file.name}`);
    if (this.app.vault.getAbstractFileByPath(dest)) {
      dest = this.uniquePath(this.notesFolder(), file.basename);
    }
    await this.app.fileManager.renameFile(file, dest);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      delete fm.archived;
    });
  }
  // -------------------------------------------------- category list I/O
  headingRe() {
    const esc = this.heading().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^#{1,6}\\s+${esc}:?\\s*$`, "i");
  }
  parseMembers(content) {
    const lines = content.split("\n");
    const start = lines.findIndex((l) => this.headingRe().test(l));
    if (start === -1) return [];
    const out = [];
    for (let i = start + 1; i < lines.length; i++) {
      if (/^#{1,6}\s/.test(lines[i])) break;
      const m = lines[i].match(/^\s*-\s+\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*$/);
      if (m) out.push(m[1].trim());
    }
    return out;
  }
  async writeMembers(file, members) {
    const sorted = [...new Set(members)].sort(
      (a, b) => a.localeCompare(b, void 0, { sensitivity: "base" })
    );
    await this.app.vault.process(file, (content) => {
      const lines = content.split("\n");
      let start = lines.findIndex((l) => this.headingRe().test(l));
      if (start === -1) {
        const trimmed = content.replace(/\n+$/, "");
        const block2 = [`## ${this.heading()}`, "", ...sorted.map((m) => `- [[${m}]]`)].join("\n");
        return (trimmed ? trimmed + "\n\n" : "") + block2 + "\n";
      }
      let end = lines.length;
      for (let i = start + 1; i < lines.length; i++) {
        if (/^#{1,6}\s/.test(lines[i])) {
          end = i;
          break;
        }
      }
      const block = ["", ...sorted.map((m) => `- [[${m}]]`), ""];
      lines.splice(start + 1, end - (start + 1), ...block);
      return lines.join("\n");
    });
  }
  async addMember(file, basename) {
    const members = await this.categoryMembers(file);
    if (members.includes(basename)) return;
    members.push(basename);
    await this.writeMembers(file, members);
  }
  async removeMember(file, basename) {
    const members = await this.categoryMembers(file);
    if (!members.includes(basename)) return;
    await this.writeMembers(
      file,
      members.filter((m) => m !== basename)
    );
  }
};

// src/view.ts
var import_obsidian18 = require("obsidian");
var VIEW_TYPE_DASH = "daily-dashboard";
var DashView = class extends import_obsidian18.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.mounted = [];
  }
  getViewType() {
    return VIEW_TYPE_DASH;
  }
  getDisplayText() {
    return "Daily Dashboard";
  }
  getIcon() {
    return "layout-dashboard";
  }
  ctx() {
    return {
      app: this.app,
      plugin: this.plugin,
      bridge: this.plugin.bridge,
      todos: this.plugin.todos,
      runtime: this.plugin.runtime,
      settings: () => this.plugin.settings,
      requestRefresh: (reason = "manual") => void this.refreshPanels(reason)
    };
  }
  async onOpen() {
    await this.build();
  }
  /** Re-mount all panels — used when the panel set or order changes. */
  async rebuild() {
    await this.build();
  }
  /** Live theme switch: restamp the root attribute, no rebuild. */
  applyTheme() {
    this.contentEl.dataset.theme = this.plugin.settings.theme;
  }
  async onClose() {
    this.teardown();
    this.contentEl.empty();
  }
  teardown() {
    var _a, _b;
    for (const m of this.mounted) {
      try {
        (_b = (_a = m.panel).unmount) == null ? void 0 : _b.call(_a);
      } catch (e) {
      }
    }
    this.mounted = [];
  }
  async build() {
    this.teardown();
    const root = this.contentEl;
    root.empty();
    root.addClass("dash-root");
    root.dataset.theme = this.plugin.settings.theme;
    this.renderChrome(root);
    this.grid = root.createDiv({ cls: "dash-grid" });
    const s = this.plugin.settings;
    const panels = createPanels(s.panelOrder, s.enabledPanels);
    const ctx = this.ctx();
    for (const panel of panels) {
      const host = this.grid.createDiv({ cls: "dash-panel" });
      host.dataset.panel = panel.id;
      this.mounted.push({ panel, host });
      await this.mountPanel(panel, host, ctx);
    }
  }
  renderChrome(root) {
    const header = root.createDiv({ cls: "dash-topbar" });
    const brand = header.createDiv({ cls: "dash-brand" });
    brand.appendChild(dashMark());
    brand.createDiv({ cls: "dash-brand-name", text: "Daily Dashboard" });
    const refresh = header.createEl("button", { cls: "dash-icon-btn", attr: { "aria-label": "Refresh" } });
    (0, import_obsidian18.setIcon)(refresh, "refresh-cw");
    refresh.addEventListener("click", () => void this.refreshPanels("manual"));
  }
  async mountPanel(panel, host, ctx) {
    host.empty();
    const body = host.createDiv({ cls: "dash-panel-body" });
    try {
      await panel.mount(body, ctx);
    } catch (e) {
      this.renderErrorCard(host, panel, e);
    }
  }
  /** Plain-language failure card — tells the user what happened and that the
   * rest of the dashboard still works. The detail goes to the console. */
  renderErrorCard(host, panel, err) {
    console.error(`Daily Dashboard: panel "${panel.id}" failed`, err);
    host.empty();
    host.addClass("dash-panel-error");
    const card = host.createDiv({ cls: "dash-error-card" });
    card.createDiv({ cls: "dash-placard", text: panel.title });
    card.createDiv({
      cls: "dash-error-note",
      text: "This panel couldn't load right now. The rest of your dashboard is fine \u2014 try the refresh button, or reopen the dashboard."
    });
  }
  async refreshPanels(reason) {
    var _a, _b;
    for (const m of this.mounted) {
      try {
        await ((_b = (_a = m.panel).refresh) == null ? void 0 : _b.call(_a, reason));
      } catch (e) {
        this.renderErrorCard(m.host, m.panel, e);
      }
    }
  }
};
function dashMark() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("class", "dash-mark");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  const frame = document.createElementNS(ns, "rect");
  frame.setAttribute("x", "3");
  frame.setAttribute("y", "3");
  frame.setAttribute("width", "26");
  frame.setAttribute("height", "26");
  frame.setAttribute("rx", "6");
  frame.setAttribute("class", "dash-mark-frame");
  svg.appendChild(frame);
  const rows = [
    [9, 14],
    [15, 20],
    [21, 12]
  ];
  for (const [y, w] of rows) {
    const bar = document.createElementNS(ns, "rect");
    bar.setAttribute("x", "8");
    bar.setAttribute("y", String(y));
    bar.setAttribute("width", String(w));
    bar.setAttribute("height", "2.5");
    bar.setAttribute("rx", "1.25");
    bar.setAttribute("class", "dash-mark-bar");
    svg.appendChild(bar);
  }
  return svg;
}

// src/main.ts
var DailyDashPlugin = class extends import_obsidian19.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.runtime = { typingUntil: 0, textFocused: false };
    this.refreshTimer = null;
  }
  async onload() {
    this.registerView(VIEW_TYPE_DASH, (leaf) => new DashView(leaf, this));
    this.bridge = new Bridge(this.app);
    this.secondBrain = new LibraryStore(this.app, () => ({
      root: this.settings.secondBrainPath,
      categoriesSubfolder: "Categories",
      archiveSubfolder: this.settings.secondBrainArchiveSubfolder,
      listHeading: "Notes"
    }));
    this.knowledgeBase = new LibraryStore(this.app, () => ({
      root: this.settings.kbRootPath,
      notesSubfolder: this.settings.kbNotesSubfolder,
      categoriesSubfolder: this.settings.kbCategoriesSubfolder,
      archiveSubfolder: this.settings.kbArchiveSubfolder,
      listHeading: this.settings.kbListHeading
    }));
    this.directives = new DirectivesStore(this.app, () => this.settings.directivesPath);
    this.todos = new TodoStore(
      this.app,
      () => this.directives.getItems(),
      (items) => this.directives.setItems(items),
      () => this.directives.save(),
      () => ({
        marker: this.settings.completedTasksMarker,
        heading: this.settings.completedTasksHeading
      })
    );
    await this.load_();
    this.addRibbonIcon("layout-dashboard", "Open Daily Dashboard", () => void this.openDashboard());
    this.addCommand({
      id: "open-dashboard",
      name: "Open dashboard",
      callback: () => void this.openDashboard()
    });
    this.addSettingTab(new DashSettingTab(this.app, this));
    this.registerEvent(this.app.metadataCache.on("changed", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("modify", (file) => this.onVaultChange(file.path)));
    this.registerEvent(this.app.vault.on("create", (file) => this.onVaultChange(file.path)));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh()));
    this.app.workspace.onLayoutReady(() => {
      void this.loadDirectives().then(() => this.refreshOpenViews("vault"));
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", (leaf) => this.maybeReplaceEmptyLeaf(leaf))
      );
      if (this.settings.replaceNewTab) this.replaceActiveEmptyLeaf();
      if (this.settings.openOnStartup) void this.openDashboard(false);
    });
  }
  /** If enabled, swap an empty New Tab leaf for the dashboard. */
  maybeReplaceEmptyLeaf(leaf) {
    var _a;
    if (!this.settings.replaceNewTab || !leaf) return;
    if (((_a = leaf.view) == null ? void 0 : _a.getViewType()) === "empty") {
      void leaf.setViewState({ type: VIEW_TYPE_DASH });
    }
  }
  /** Replace the currently-active leaf if it's an empty New Tab. */
  replaceActiveEmptyLeaf() {
    var _a;
    this.maybeReplaceEmptyLeaf((_a = this.app.workspace.activeLeaf) != null ? _a : null);
  }
  onunload() {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
  }
  // ------------------------------------------------------------- data
  async load_() {
    var _a, _b, _c;
    const raw = await this.loadData();
    this.settings = mergeSettings(raw == null ? void 0 : raw.settings);
    this.data = {
      settings: this.settings,
      todos: (_a = raw == null ? void 0 : raw.todos) != null ? _a : [],
      seeded: (_b = raw == null ? void 0 : raw.seeded) != null ? _b : false,
      agendaCache: (_c = raw == null ? void 0 : raw.agendaCache) != null ? _c : {}
    };
    await this.saveData_();
  }
  /** Load the to-do list from its vault file the first time; nothing is seeded
   * (a fresh install starts with an empty list — the user's list is their own). */
  async loadDirectives() {
    var _a;
    const existed = await this.directives.load();
    if (existed) {
      this.data.seeded = true;
      return;
    }
    const legacy = (_a = this.data.todos) != null ? _a : [];
    if (legacy.length > 0) this.directives.setItems(legacy);
    this.data.seeded = true;
    this.data.todos = [];
    await this.directives.save();
    await this.saveData_();
  }
  /** Vault create/modify router: reload the to-do list when its file changes on
   * another device (Obsidian Sync), otherwise a plain debounced refresh. */
  onVaultChange(path) {
    if (this.directives.isDirectivesPath(path)) {
      void this.directives.onExternalChange(path).then((changed) => {
        if (changed) this.refreshOpenViews("vault");
      });
      return;
    }
    this.scheduleRefresh();
  }
  async saveData_() {
    this.data.settings = this.settings;
    await this.saveData(this.data);
  }
  get agendaCache() {
    return this.data.agendaCache;
  }
  // ------------------------------------------------------------- view
  async openDashboard(reveal = true) {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH);
    let leaf;
    if (existing.length > 0) {
      leaf = existing[0];
    } else {
      leaf = reveal ? this.app.workspace.getLeaf(true) : this.app.workspace.getLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_DASH, active: reveal });
    }
    if (reveal) this.app.workspace.revealLeaf(leaf);
  }
  refreshOpenViews(reason = "manual") {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH)) {
      const view = leaf.view;
      if (view instanceof DashView) void view.refreshPanels(reason);
    }
  }
  /** Re-mount panels in every open view — for panel enable/reorder changes. */
  rebuildOpenViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH)) {
      const view = leaf.view;
      if (view instanceof DashView) void view.rebuild();
    }
  }
  /** Apply the current theme to every open view without a rebuild (live switch). */
  applyThemeToViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH)) {
      const view = leaf.view;
      if (view instanceof DashView) view.applyTheme();
    }
  }
  scheduleRefresh() {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      if (this.runtime.textFocused || Date.now() < this.runtime.typingUntil) {
        this.scheduleRefresh();
        return;
      }
      this.refreshOpenViews("vault");
    }, 300);
  }
};
