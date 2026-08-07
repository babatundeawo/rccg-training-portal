// Offline NKJV Scripture Database for RCCG Training Manuals
const RCCG_SCRIPTURES = {
  "john 3:3": "Jesus answered and said to him, 'Most assuredly, I say to you, unless one is born again, he cannot see the kingdom of God.'",
  "john 3:5": "Jesus answered, 'Most assuredly, I say to you, unless one is born of water and the Spirit, he cannot enter the kingdom of God.'",
  "john 3:16": "For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.",
  "john 3:17": "For God did not send His Son into the world to condemn the world, but that the world through Him might be saved.",
  "john 1:11": "He came to His own, and His own did not receive Him.",
  "john 1:12": "But as many as received Him, to them He gave the right to become children of God, to those who believe in His name:",
  "john 1:13": "who were born, not of blood, nor of the will of the flesh, nor of the will of man, but of God.",
  "romans 3:20": "Therefore by the deeds of the law no flesh will be justified in His sight, for by the law is the knowledge of sin.",
  "romans 3:23": "for all have sinned and fall short of the glory of God,",
  "romans 5:12": "Therefore, just as through one man sin entered the world, and death through sin, and thus death spread to all men, because all sinned—",
  "romans 5:17": "For if by the one man’s offense death reigned through the one, much more those who receive abundance of grace and of the gift of righteousness will reign in life through the One, Jesus Christ.",
  "romans 6:4": "Therefore we were buried with Him through baptism into death, that just as Christ was raised from the dead by the glory of the Father, even so we also should walk in newness of life.",
  "romans 6:18": "And having been set free from sin, you became slaves of righteousness.",
  "romans 8:1": "There is therefore now no condemnation to those who are in Christ Jesus, who do not walk according to the flesh, but according to the Spirit.",
  "romans 8:16": "The Spirit Himself bears witness with our spirit that we are children of God,",
  "romans 8:17": "and if children, then heirs—heirs of God and joint heirs with Christ, if indeed we suffer with Him, that we also may be glorified together.",
  "romans 8:28": "And we know that all things work together for good to those who love God, to those who are the called according to His purpose.",
  "romans 12:1": "I beseech you therefore, brethren, by the mercies of God, that you present your bodies a living sacrifice, holy, acceptable to God, which is your reasonable service.",
  "romans 12:2": "And do not be conformed to this world, but be transformed by the renewing of your mind, that you may prove what is that good and acceptable and perfect will of God.",
  "2 corinthians 5:17": "Therefore, if anyone is in Christ, he is a new creation; old things have passed away; behold, all things have become new.",
  "2 corinthians 5:21": "For He made Him who knew no sin to be sin for us, that we might become the righteousness of God in Him.",
  "galatians 2:20": "I have been crucified with Christ; it is no longer I who live, but Christ lives in me; and the life which I now live in the flesh I live by faith in the Son of God, who loved me and gave Himself for me.",
  "galatians 3:27": "For as many of you as were baptized into Christ have put on Christ.",
  "galatians 5:19": "Now the works of the flesh are evident, which are: adultery, fornication, uncleanness, lewdness,",
  "galatians 5:20": "idolatry, sorcery, hatred, contentions, jealousies, outbursts of wrath, selfish ambitions, dissensions, heresies,",
  "galatians 5:21": "envy, murders, drunkenness, revelries, and the like; of which I tell you beforehand, just as I also told you in time past, that those who practice such things will not inherit the kingdom of God.",
  "galatians 5:22": "But the fruit of the Spirit is love, joy, peace, longsuffering, kindness, goodness, faithfulness,",
  "galatians 5:23": "gentleness, self-control. Against such there is no law.",
  "ephesians 2:8": "For by grace you have been saved through faith, and that not of yourselves; it is the gift of God,",
  "ephesians 2:9": "not of works, lest anyone should boast.",
  "ephesians 2:10": "For we are His workmanship, created in Christ Jesus for good works, which God prepared beforehand that we should walk in them.",
  "ephesians 4:22": "that you put off, concerning your former conduct, the old man which grows corrupt according to the deceitful lusts,",
  "ephesians 4:24": "and that you put on the new man which was created according to God, in true righteousness and holiness.",
  "ephesians 5:11": "And have no fellowship with the unfruitful works of darkness, but rather expose them.",
  "philippians 4:4": "Rejoice in the Lord always. Again I will say, rejoice!",
  "philippians 4:5": "Let your gentleness be known to all men. The Lord is at hand.",
  "philippians 4:6": "Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God;",
  "philippians 4:7": "and the peace of God, which surpasses all understanding, will guard your hearts and minds through Christ Jesus.",
  "colossians 1:13": "He has delivered us from the power of darkness and translated us into the kingdom of the Son of His love,",
  "colossians 3:5": "Therefore put to death your members which are on the earth: fornication, uncleanness, passion, evil desire, and covetousness, which is idolatry.",
  "colossians 3:8": "But now you yourselves must also put off all these: anger, wrath, malice, blasphemy, filthy language out of your mouth.",
  "colossians 3:10": "and have put on the new man who is renewed in knowledge according to the image of Him who created him,",
  "1 thessalonians 5:17": "pray without ceasing,",
  "1 thessalonians 5:22": "Abstain from every form of evil.",
  "1 thessalonians 5:23": "Now may the God of peace Himself sanctify you completely; and may your whole spirit, soul, and body be preserved blameless at the coming of our Lord Jesus Christ.",
  "1 timothy 3:2": "A bishop then must be blameless, the husband of one wife, temperate, sober-minded, of good behavior, hospitable, able to teach;",
  "1 timothy 6:6": "Now godliness with contentment is great gain.",
  "1 timothy 6:10": "For the love of money is a root of all kinds of evil, for which some have strayed from the faith in their greediness, and pierced themselves through with many sorrows.",
  "2 timothy 2:15": "Be diligent to present yourself approved to God, a worker who does not need to be ashamed, rightly dividing the word of truth.",
  "2 timothy 3:16": "All Scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness,",
  "2 timothy 3:17": "that the man of God may be complete, thoroughly equipped for every good work.",
  "hebrews 6:1": "Therefore, leaving the discussion of the elementary principles of Christ, let us go on to perfection, not laying again the foundation of repentance from dead works and of faith toward God,",
  "hebrews 6:2": "of the doctrine of baptisms, of laying on of hands, of resurrection of the dead, and of eternal judgment.",
  "hebrews 9:27": "And as it is appointed for men to die once, but after this the judgment,",
  "hebrews 10:25": "not forsaking the assembling of ourselves together, as is the manner of some, but exhorting one another, and so much the more as you see the Day approaching.",
  "hebrews 12:14": "Pursue peace with all people, and holiness, without which no one will see the Lord:",
  "hebrews 13:17": "Obey those who rule over you, and be submissive, for they watch out for your souls, as those who must give account. Let them do so with joy and not with grief, for that would be unprofitable for you.",
  "james 4:7": "Therefore submit to God. Resist the devil and he will flee from you.",
  "1 peter 2:2": "as newborn babes, desire the pure milk of the word, that you may grow thereby,",
  "1 peter 2:9": "But you are a chosen generation, a royal priesthood, a holy nation, His own special people, that you may proclaim the praises of Him who called you out of darkness into His marvelous light;",
  "1 peter 2:21": "For to this you were called, because Christ also suffered for us, leaving us an example, that you should follow His steps:",
  "1 peter 2:24": "who Himself bore our sins in His own body on the tree, that we, having died to sins, might live for righteousness—by whose stripes you were healed.",
  "1 peter 5:8": "Be sober, be vigilant; because your adversary the devil walks about like a roaring lion, seeking whom he may devour.",
  "1 john 1:9": "If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.",
  "1 john 2:29": "If you know that He is righteous, you know that everyone who practices righteousness is born of Him.",
  "1 john 3:10": "In this the children of God and the children of the devil are manifest: Whoever does not practice righteousness is not of God, nor is he who does not love his brother.",
  "1 john 4:7": "Beloved, let us love one another, for love is of God; and everyone who loves is born of God and knows God.",
  "1 john 5:4": "For whatever is born of God overcomes the world. And this is the victory that has overcome the world—our faith.",
  "1 john 5:5": "Who is he who overcomes the world, but he who believes that Jesus is the Son of God?",
  "1 john 5:18": "We know that whoever is born of God does not sin; but he who has been born of God keeps himself, and the wicked one does not touch him.",
  "revelation 20:15": "And anyone not found written in the Book of Life was cast into the lake of fire.",
  "proverbs 28:13": "He who covers his sins will not prosper, But whoever confesses and forsakes them will have mercy.",
  "isaiah 1:19": "If you are willing and obedient, You shall eat the good of the land;",
  "isaiah 55:7": "Let the wicked forsake his way, And the unrighteous man his thoughts; Let him return to the LORD, And He will have mercy on him; And to our God, For He will abundantly pardon.",
  "isaiah 64:6": "But we are all like an unclean thing, And all our righteousnesses are like filthy rags; We all fade as a leaf, And our iniquities, like the wind, Have taken us away.",
  "joshua 1:8": "This Book of the Law shall not depart from your mouth, but you shall meditate in it day and night, that you may observe to do according to all that is written in it. For then you will make your way prosperous, and then you will have good success.",
  "psalm 51:17": "The sacrifices of God are a broken spirit, A broken and a contrite heart— These, O God, You will not despise.",
  "psalm 119:9": "How can a young man cleanse his way? By taking heed according to Your word.",
  "psalm 119:11": "Your word I have hidden in my heart, That I might not sin against You.",
  "psalm 119:105": "Your word is a lamp to my feet And a light to my path.",
  "malachi 3:10": "Bring all the tithes into the storehouse, That there may be food in My house, And try Me now in this,' Says the LORD of hosts, 'If I will not open for you the windows of heaven And pour out for you such blessing That there will not be room enough to receive it.",
  "matthew 28:19": "Go therefore and make disciples of all the nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit,",
  "acts 1:8": "But you shall receive power when the Holy Spirit has come upon you; and you shall be witnesses to Me in Jerusalem, and in all Judea and Samaria, and to the end of the earth.",
  "acts 2:4": "And they were all filled with the Holy Spirit and began to speak with other tongues, as the Spirit gave them utterance.",
  "acts 3:19": "Repent therefore and be converted, that your sins may be blotted out, so that times of refreshing may come from the presence of the Lord,",
  "acts 24:16": "This being so, I myself always strive to have a conscience without offense toward God and men."
};

// Normalized lookup utility
function getScriptureText(reference) {
  if (!reference) return null;
  
  // Clean and normalize reference string
  let cleanRef = reference.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^jn\.?\s/i, 'john ')
    .replace(/^rom\.?\s/i, 'romans ')
    .replace(/^eph\.?\s/i, 'ephesians ')
    .replace(/^heb\.?\s/i, 'hebrews ')
    .replace(/^phil\.?\s/i, 'philippians ')
    .replace(/^col\.?\s/i, 'colossians ')
    .replace(/^pet\.?\s/i, 'peter ')
    .replace(/^1\s?pet\.?\s/i, '1 peter ')
    .replace(/^2\s?pet\.?\s/i, '2 peter ')
    .replace(/^1\s?cor\.?\s/i, '1 corinthians ')
    .replace(/^2\s?cor\.?\s/i, '2 corinthians ')
    .replace(/^prov\.?\s/i, 'proverbs ')
    .replace(/^isa\.?\s/i, 'isaiah ')
    .replace(/^josh\.?\s/i, 'joshua ')
    .replace(/^ps\.?\s/i, 'psalm ')
    .replace(/^psalm\s119-98-100/i, 'psalm 119:98')
    .trim();

  // Try exact lookup first
  if (RCCG_SCRIPTURES[cleanRef]) {
    return RCCG_SCRIPTURES[cleanRef];
  }
  
  // Try mapping range to first verse (e.g. John 3:3-5 -> John 3:3)
  let baseRef = cleanRef.split('-')[0].trim();
  if (RCCG_SCRIPTURES[baseRef]) {
    return RCCG_SCRIPTURES[baseRef];
  }
  
  return null;
}
