import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { generateAiInsight } from "~/lib/ai.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { session } = await authenticate.admin(request);
    const shopId = session.shop;
    const body = await request.json();
    const { question, context } = body;

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const answer = await generateAiInsight(context, question);

    await prisma.aiInsight.create({
      data: {
        shopId,
        insightType: "chat",
        question,
        answer,
        data: JSON.stringify(context?.kpis || {}),
      },
    });

    return new Response(
      JSON.stringify({ answer, question }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("AI API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate insight" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
