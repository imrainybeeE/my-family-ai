import { Household, HouseholdMember, MemberTasteAnswers } from '../types';
import { generateFamilyProfileReport } from '../utils/familyProfileAnalysis';

export interface AskAiRequest {
  prompt: string;
  household: Household | null;
  activeMember: HouseholdMember | null;
  members: HouseholdMember[];
  responses: Record<string, MemberTasteAnswers>;
}

export interface AskAiResponse {
  answer: string;
  suggestedFamilyQuestion?: string;
}

/**
 * Sends a question to the backend Gemini AI Family Assistant endpoint (/api/ask-ai).
 * Automatically provides fallback responses based on household questionnaire data
 * if network or server errors occur.
 */
export async function askFamilyAi(req: AskAiRequest): Promise<AskAiResponse> {
  const { prompt, household, activeMember, members, responses } = req;

  try {
    const res = await fetch('/api/ask-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        household,
        activeMember,
        members,
        responses,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.text) {
        return { answer: data.text };
      }
    }
  } catch (err) {
    console.warn('Network call to /api/ask-ai failed, using deterministic living room analysis:', err);
  }

  // Fallback: rule-based generation conforming to all 8 requirements
  return generateDeterministicFamilyAnswer(prompt, household, activeMember, members, responses);
}

/**
 * Client-side deterministic fallback engine
 * Strictly respects all 8 user requirements:
 * 1. Clearly distinguishes facts from suggestions ("Based on the answers provided...").
 * 2. If data doesn't answer, states there's not enough info and suggests a discussion question.
 * 3. Never diagnoses mental health, personality, or relationships.
 * 4. Never ranks or criticizes members.
 * 5. Positive, practical, age-appropriate.
 */
export function generateDeterministicFamilyAnswer(
  prompt: string,
  household: Household | null,
  activeMember: HouseholdMember | null,
  members: HouseholdMember[],
  responses: Record<string, MemberTasteAnswers>
): AskAiResponse {
  const lower = prompt.toLowerCase();
  const report = generateFamilyProfileReport(members, responses);

  // 1. "What does my child enjoy most?"
  if (lower.includes('child') && (lower.includes('enjoy') || lower.includes('like'))) {
    // Find child/student/sibling members
    const childMembers = members.filter((m) =>
      ['Me', 'Brother', 'Sister'].includes(m.role) || (activeMember && activeMember.role !== m.role && ['Parent', 'Mum', 'Dad'].includes(activeMember.role))
    );

    if (childMembers.length === 0) {
      return {
        answer: 'Based on the answers provided... there are currently no members marked with a child or student role in the household roster.',
        suggestedFamilyQuestion: 'What is one activity that made you smile the most this past week?',
      };
    }

    const answersList: string[] = [];
    for (const c of childMembers) {
      const resp = responses[c.id];
      const name = c.nickname || c.role;
      if (resp && resp.discoveryProfile) {
        answersList.push(
          `${name} discovered the ${resp.discoveryProfile.primaryStyle} style (with a strong ${resp.discoveryProfile.secondaryStyle} touch). They especially enjoy ${
            resp.weekendActivities?.slice(0, 2).join(' and ') || 'creative and exploratory weekend moments'
          }.`
        );
      } else if (resp && resp.favoriteCuisines?.length) {
        answersList.push(`${name} shared that they love ${resp.favoriteCuisines.join(' and ')}.`);
      }
    }

    if (answersList.length > 0) {
      return {
        answer: `Based on the answers provided... ${answersList.join(' ')}\n\nSuggestions to explore together: Set aside an afternoon for a shared activity where they get to lead the plan!`,
      };
    }

    return {
      answer: 'Based on the answers provided... there is not enough information yet because your child has not answered the questionnaire.',
      suggestedFamilyQuestion: 'What is your favorite way to spend a Saturday afternoon when you have zero homework?',
    };
  }

  // 2. "How does my child prefer to be supported?"
  if (lower.includes('support') || lower.includes('comfort') || lower.includes('long day')) {
    const answeredWithSupport = members.filter((m) => {
      const resp = responses[m.id];
      return resp?.foundationAnswers && (resp.foundationAnswers[16] || resp.foundationAnswers[17]);
    });

    if (answeredWithSupport.length > 0) {
      const lines = answeredWithSupport.map((m) => {
        const resp = responses[m.id];
        const name = m.nickname || m.role;
        const q16 = resp.foundationAnswers?.[16];
        const q17 = resp.foundationAnswers?.[17];
        const q17Text = Array.isArray(q17) ? q17.join(' and ') : q17;
        return `${name} appreciates when family: "${q16 || ''}" and feels most supported when "${q17Text || ''}".`;
      });

      return {
        answer: `Based on the answers provided...\n• ${lines.join('\n• ')}\n\nSuggestion: Small, low-pressure gestures matching their preferred style mean the world after a demanding day.`,
      };
    }

    return {
      answer: 'Based on the answers provided... we do not have responses for Section 6 (Family & Support) yet.',
      suggestedFamilyQuestion: 'When you are having a tiring or stressful day, do you prefer quiet time alone, a warm conversation, or a fun distraction?',
    };
  }

  // 3. "What do we have in common?"
  if (lower.includes('common') || lower.includes('share') || lower.includes('same')) {
    if (report.thingsWeEnjoyTogether.length > 0) {
      const details = report.thingsWeEnjoyTogether
        .map((t) => `• ${t.title}: ${t.detail}`)
        .join('\n');
      return {
        answer: `Based on the answers provided, here are your household common grounds:\n\n${details}\n\nSuggestion: Build a weekend ritual around these shared interests!`,
      };
    }

    return {
      answer: 'Based on the answers provided... we need at least two completed member questionnaires to highlight your shared tastes.',
      suggestedFamilyQuestion: 'What is one movie or meal that everyone in this house can always agree on?',
    };
  }

  // 4. "Where are we different?"
  if (lower.includes('different') || lower.includes('difference')) {
    if (report.interestingDifferences.length > 0) {
      const diffs = report.interestingDifferences
        .map((d) => `• ${d.title}: ${d.detail}\n  Positive bridge: ${d.positiveBridge}`)
        .join('\n\n');
      return {
        answer: `Based on the answers provided, here are your family’s unique differences:\n\n${diffs}\n\nDifferences make a household versatile: one person brings excitement while another brings peace!`,
      };
    }

    return {
      answer: 'Based on the answers provided... there is not enough questionnaire data to pinpoint specific differences yet.',
      suggestedFamilyQuestion: 'If you could plan an entire Saturday from morning to night with no limits, what would your itinerary look like?',
    };
  }

  // 5. "Suggest something we could enjoy together"
  if (lower.includes('enjoy together') || lower.includes('suggest') || lower.includes('activity')) {
    if (report.ideasWorthTrying.length > 0) {
      const ideas = report.ideasWorthTrying
        .map((idea) => `• ${idea.title} (${idea.category}): ${idea.whyItFits}\n  Tip: ${idea.funTip}`)
        .join('\n\n');
      return {
        answer: `Based on the answers provided, here are personalized ideas for your family:\n\n${ideas}`,
      };
    }

    return {
      answer: 'Based on the answers provided... a custom taco bar or build-your-own pizza night lets everyone customize their plate to their taste!',
      suggestedFamilyQuestion: 'Would you rather have a cozy board game night at home or an outdoor picnic adventure this weekend?',
    };
  }

  // 6. "What could I ask my family member to understand them better?"
  if (lower.includes('understand') || lower.includes('ask') || lower.includes('conversation')) {
    return {
      answer: `Based on the answers provided, here are warm, open questions you can ask in the living room:\n\n1. "What is something fun you are curious to learn or build this month?"\n2. "If you could pick one new dinner recipe for us to make together, what would you want to try?"\n3. "What helps your mind relax the most when you feel rushed?"\n\nSuggestion: Ask one question during family dinner or when riding in the car together!`,
    };
  }

  // General query fallback
  return {
    answer: `Based on the answers provided by your household (${members.map((m) => m.nickname || m.role).join(', ')})... we are focusing on your shared food, movie, and weekend discovery styles. If this question is about a new topic, it's a great candidate for living room discussion!`,
    suggestedFamilyQuestion: 'What is one small thing our family did together this year that you loved?',
  };
}
