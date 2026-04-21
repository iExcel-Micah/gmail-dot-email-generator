// Strict email validator tailored to the Gmail Dot Generator tool.
//
// This tool ONLY accepts Gmail/Googlemail addresses, so `parseGmailAddress`
// already enforces the domain. The validator here adds the pieces that
// `parseGmailAddress` does not: a generic RFC-shaped format check, length
// bounds, a fake-user blocklist, and — most importantly — a Gmail-focused
// typo map that catches "gmail.con", "gmail.co", "gmial.com", etc., so we
// can tell the user "Did you mean gmail.com?" before we ever try to email
// the results. DISPOSABLE_DOMAINS is exported for parity with the sibling
// tool, but is not applied here because Gmail is never disposable.

// --- Disposable/throwaway email provider list (ported from
// iexcel-ai-search-grader/server.js). Not used in this tool's validation,
// exported only so callers that want a broader check can reach for it. ---
export const DISPOSABLE_DOMAINS = new Set([
  // Top disposable/throwaway email providers
  'mailinator.com','guerrillamail.com','guerrillamail.de','guerrillamail.net','guerrillamail.org',
  'tempmail.com','temp-mail.org','temp-mail.io','throwaway.email','throwaway.com',
  'yopmail.com','yopmail.fr','yopmail.net','sharklasers.com','guerrillamailblock.com',
  'grr.la','dispostable.com','trashmail.com','trashmail.net','trashmail.me','trashmail.org',
  'mailnesia.com','maildrop.cc','mailsac.com','10minutemail.com','10minutemail.net',
  'minutemail.com','tempinbox.com','discard.email','discardmail.com','discardmail.de',
  'fakeinbox.com','fakemail.net','mohmal.com','getnada.com','emailondeck.com',
  'burnermail.io','mailcatch.com','mytemp.email','tempr.email','tempail.com',
  'mailnull.com','spamgourmet.com','harakirimail.com','jetable.org','trashinbox.com',
  'crazymailing.com','mailtemp.info','mailtemp.net','mytrashmail.com','trashymail.com',
  'tmpmail.net','tmpmail.org','binkmail.com','bobmail.info','chammy.info','devnullmail.com',
  'einrot.com','emailigo.de','emailsensei.com','emailtemporario.com.br','ephemail.net',
  'filzmail.com','fixmail.tk','flurred.com','get2mail.fr','getairmail.com',
  'gishpuppy.com','grandmamail.com','great-host.in','greensloth.com','haltospam.com',
  'hotpop.com','ieh-mail.de','imails.info','inbax.tk','incognitomail.org',
  'instantemailaddress.com','ipoo.org','irish2me.com','iwi.net','jetable.com',
  'jnxjn.com','jourrapide.com','kasmail.com','kaspop.com','keepmymail.com',
  'killmail.com','killmail.net','klzlk.com','koszmail.pl','kurzepost.de',
  'letthemeatspam.com','lhsdv.com','lifebyfood.com','link2mail.net','litedrop.com',
  'lol.ovpn.to','lookugly.com','lr78.com','lroid.com','lukop.dk',
  'maboard.com','mail-hierarchi.de','mail-temporaire.fr','mail.by','mail.mezimages.net',
  'mail2rss.org','mail333.com','mail4trash.com','mailbidon.com','mailblocks.com',
  'mailbox52.ga','mailbox80.biz','mailbox92.biz','mailchop.com',
  'mailexpire.com','mailfa.tk','mailforspam.com','mailfree.ga','mailfreeonline.com',
  'mailfs.com','mailguard.me','mailhazard.com','mailhz.me','mailimate.com',
  'mailin8r.com','mailinater.com','mailinator.net','mailinator.org','mailinator2.com',
  'mailincubator.com','mailismagic.com','mailmate.com','mailmoat.com','mailnator.com',
  'mailseal.de','mailshell.com','mailsiphon.com','mailslapping.com','mailslite.com',
  'mailzilla.com','mailzilla.org','mbx.cc','mega.zik.dj','meltmail.com',
  'messagebeamer.de','mezimages.net','mfsa.ru','ministry-of-silly-walks.de','mintemail.com',
  'mt2015.com','mx0.wwwnew.eu','my10minutemail.com','mypartyclip.de','myphantom.com',
  'mysamp.de','myspaceinc.com','myspaceinc.net','myspaceinc.org','myspacepimpedup.com',
  'mytempemail.com','mytempmail.com','neomailbox.com','nepwk.com','nervmich.net',
  'nervtansen.de','netmails.com','netmails.net','neverbox.com','no-spam.ws',
  'nobulk.com','noclickemail.com','nogmailspam.info','nomail.xl.cx','nomail2me.com',
  'nomorespamemails.com','nonspam.eu','nonspammer.de','noref.in','nothingtoseehere.ca',
  'nowmymail.com','nurfuerspam.de','nus.edu.sg','nwldx.com','objectmail.com',
  'obobbo.com','odnorazovoe.ru','oneoffemail.com','onewaymail.com','oopi.org',
  'ordinaryamerican.net','otherinbox.com','ourklips.com','outlawspam.com','ovpn.to',
  'owlpic.com','pancakemail.com','pimpedupmyspace.com','pjjkp.com','plexolan.de',
  'pookmail.com','privacy.net','proxymail.eu','prtnx.com','putthisinyourspamdatabase.com',
  'qq.com','quickinbox.com','rcpt.at','reallymymail.com','recode.me',
  'recursor.net','regbypass.com','regbypass.comsafe-mail.net','rejectmail.com','reliable-mail.com',
  'rhyta.com','rklips.com','rmqkr.net','royal.net','rppkn.com',
  'rtrtr.com','s0ny.net','safe-mail.net','safersignup.de','safetymail.info',
  'safetypost.de','sandelf.de','saynotospams.com','scatmail.com','schafmail.de',
  'selfdestructingmail.com','sendspamhere.com','shieldedmail.com','shiftmail.com','shitmail.me',
  'shortmail.net','sibmail.com','sinnlos-mail.de','siteposter.net','skeefmail.com',
  'slaskpost.se','slipry.net','slopsbox.com','slowslow.de','smashmail.de',
  'smellfear.com','snakemail.com','sneakemail.com','sneakymail.de','snkmail.com',
  'sofimail.com','sofort-mail.de','softpls.asia','sogetthis.com','soodonims.com',
  'spam.la','spam.su','spam4.me','spamavert.com','spambob.com',
  'spambob.net','spambob.org','spambog.com','spambog.de','spambog.ru',
  'spambox.us','spamcannon.com','spamcannon.net','spamcero.com','spamcon.org',
  'spamcorptastic.com','spamcowboy.com','spamcowboy.net','spamcowboy.org','spamday.com',
  'spamex.com','spamfighter.cf','spamfighter.ga','spamfighter.gq','spamfighter.ml',
  'spamfighter.tk','spamfree24.com','spamfree24.de','spamfree24.eu','spamfree24.info',
  'spamfree24.net','spamfree24.org','spamgoes.in','spamherelots.com','spamhereplease.com',
  'spamhole.com','spamify.com','spaminator.de','spamkill.info','spaml.com',
  'spaml.de','spammotel.com','spamobox.com','spamoff.de','spamslicer.com',
  'spamspot.com','spamstack.net','spamthis.co.uk','spamtrap.ro','spamtrail.com',
  'spamwc.de','supergreatmail.com','supermailer.jp','suremail.info','svk.jp',
  'sweetxxx.de','tafmail.com','tagyoureit.com','talkinator.com','tapchicuoihoi.com',
  'teleworm.us','thankyou2010.com','thc.st','thecriminals.com','thisisnotmyrealemail.com',
  'thismail.net','throwawayemailaddress.com','tilien.com','tittbit.in','tizi.com',
  'tmailinator.com','toiea.com','toomail.biz','topranklist.de','tradermail.info',
  'trash-amil.com','trash-mail.at','trash-mail.com','trash-mail.de','trash2009.com',
  'trashemail.de','trashevery.com','trashmail.at','trashmail.io','trashmail.ws',
  'trashmailer.com','trashymail.net','trbvm.com','trbvn.com','trialmail.de',
  'trickmail.net','trillianpro.com','turual.com','twinmail.de','tyldd.com',
  'uggsrock.com','umail.net','upliftnow.com','uplipht.com','venompen.com',
  'veryreallyfakemail.com','viditag.com','viewcastmedia.com','viewcastmedia.net',
  'viewcastmedia.org','vomoto.com','vpn.st','vsimcard.com','vubby.com',
  'wasteland.rfc822.org','webemail.me','weg-werf-email.de','wegwerfadresse.de',
  'wegwerfemail.com','wegwerfemail.de','wegwerfmail.de','wegwerfmail.info','wegwerfmail.net',
  'wegwerfmail.org','wh4f.org','whatiaas.com','whatpaas.com','whyspam.me',
  'wickmail.net','wilemail.com','willhackforfood.biz','willselfdestruct.com','winemaven.info',
  'wronghead.com','wuzup.net','wuzupmail.net','wwwnew.eu','x.ip6.li',
  'xagloo.com','xemaps.com','xents.com','xjoi.com','xmaily.com',
  'xoxy.net','yapped.net','yeah.net','yep.it','yogamaven.com',
  'yomail.info','yopmail.gq','yuurok.com','zehnminutenmail.de','zippymail.info',
  'zoaxe.com','zoemail.org','zomg.info','zxcv.com','zxcvbnm.com',
  'zzz.com','mailkept.com','anonbox.net','anonymbox.com','anonymail.dk',
  'anonymousspeech.com','antireg.ru','bspamfree.org','bugmenot.com','bund.us',
  'cachedot.net','center-mail.de','chacuo.net','cock.li','correo.blogos.net',
  'cosmorph.com','courriel.fr.nf','courrieltemporaire.com','crapmail.org','cubiclink.com',
  'dayrep.com','dcemail.com','deadaddress.com','despammed.com',
  'dfgh.net','digitalsanctuary.com','disposableaddress.com','disposableemailaddresses.emailmiser.com',
  'disposableinbox.com','dispose.it','dm.w3internet.co.uk','dodgeit.com','dodgit.com',
  'donemail.ru','dontreg.com','dontsendmespam.de','drdrb.com','dump-email.info',
  'dumpanyjunk.com','dumpyemail.com','e-mail.com','e-mail.org','e4ward.com',
  'easytrashmail.com','emaildienst.de','emailgo.de','emailias.com',
  'emailinfive.com','emaillime.com','emailmiser.com','emailproxsy.com','emails.ga',
  'emailtemporanea.com','emailtemporanea.net',
  'emailwarden.com','emailx.at.hm','emailxfer.com','emz.net','enterto.com',
  'etranquil.com','etranquil.net','etranquil.org','evopo.com',
  'explodemail.com','express.net.ua','eyepaste.com','fastacura.com','fastchevy.com',
  'fastchrysler.com','fastkawasaki.com','fastmazda.com','fastmitsubishi.com','fastnissan.com',
  'fastsubaru.com','fastsuzuki.com','fasttoyota.com','fastyamaha.com',
  'mailinator.us','mailinator.co.uk'
]);

// Gmail-focused typo map. These are the critical ones for this tool
// because a misplaced character in the domain means the emailed results
// never reach the user. Keep this list targeted to gmail.com and the
// closest neighbors users actually fat-finger.
export const GMAIL_TYPO_MAP = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmaol.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'googlemai.com': 'googlemail.com',
  'googlemail.con': 'googlemail.com',
  'googlmail.com': 'googlemail.com'
};

const GMAIL_ACCEPTED_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

const EMAIL_FORMAT_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Fake/placeholder local parts people paste into test forms.
const FAKE_LOCAL_REGEX = /^(test|fake|asdf|qwer|spam|none|nope|no|na|null|void|xxx|abc|aaa|zzz|123)\d*$/;

/**
 * Validate an email address for this tool.
 *
 * Because the Gmail Dot Generator only operates on Gmail addresses, this
 * validator is Gmail-aware: after the generic format/length/fake-user
 * checks, it surfaces a friendly "Did you mean ...@gmail.com?" for the
 * common domain typos, and finally requires the domain to be gmail.com
 * or googlemail.com.
 *
 * @param {string} email
 * @returns {{ valid: true } | { valid: false, reason: string }}
 */
export function validateEmail(email) {
  const trimmed = String(email || '').trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, reason: 'Email is required' };
  }

  if (!EMAIL_FORMAT_REGEX.test(trimmed)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  const atIndex = trimmed.indexOf('@');
  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  // Local part length bounds.
  if (localPart.length < 2) {
    return { valid: false, reason: 'Email username too short' };
  }
  if (localPart.length > 64) {
    return { valid: false, reason: 'Email username too long' };
  }

  // Fake-user blocklist.
  if (FAKE_LOCAL_REGEX.test(localPart)) {
    return { valid: false, reason: 'Please use a real email address' };
  }

  // Domain structural check.
  if (!domainPart || domainPart.length < 4) {
    return { valid: false, reason: 'Invalid email domain' };
  }
  const domainLabels = domainPart.split('.');
  if (domainLabels.length < 2) {
    return { valid: false, reason: 'Invalid email domain' };
  }
  const tld = domainLabels[domainLabels.length - 1];
  if (tld.length < 2) {
    return { valid: false, reason: 'Invalid email domain' };
  }

  // Gmail typo detection — runs BEFORE the strict Gmail-only check so the
  // user gets a helpful suggestion instead of a generic "not Gmail".
  if (GMAIL_TYPO_MAP[domainPart]) {
    const suggestion = `${localPart}@${GMAIL_TYPO_MAP[domainPart]}`;
    return { valid: false, reason: `Did you mean ${suggestion}?` };
  }

  // This tool only works with Gmail/Googlemail addresses.
  if (!GMAIL_ACCEPTED_DOMAINS.has(domainPart)) {
    return {
      valid: false,
      reason: 'Please enter a Gmail or Googlemail address (example: name@gmail.com).'
    };
  }

  return { valid: true };
}
