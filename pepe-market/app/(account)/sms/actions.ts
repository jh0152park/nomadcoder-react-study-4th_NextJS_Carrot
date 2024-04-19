"use server";

import { z } from "zod";
import crypto from "crypto";
import validator from "validator";
import { redirect } from "next/navigation";
import PrismaDB from "@/lib/db";

const phoneSchema = z
    .string()
    .trim()
    .refine(
        (phone) => validator.isMobilePhone(phone, "ko-KR"),
        "Wroung phone number format"
    );
const tokenSchema = z.coerce.number().min(100000).max(999999);

interface IActionState {
    token: boolean;
}

async function createToken() {
    const token = crypto.randomInt(100000, 999999).toString();
    const exist = await PrismaDB.sMSToken.findUnique({
        where: {
            token: token,
        },
        select: {
            id: true,
        },
    });

    if (exist) {
        return createToken();
    } else {
        return token;
    }
}

export async function SMSVerification(
    prevState: IActionState,
    formData: FormData
) {
    const phone_number = formData.get("phone_number");
    const token = formData.get("token");

    console.log(`phone number is ${phone_number}`);

    if (!prevState.token) {
        // current user puted a phone number
        const result = phoneSchema.safeParse(phone_number);
        console.log(result);
        if (!result.success) {
            return {
                token: false,
                error: result.error.flatten(),
            };
        } else {
            // delete previous token
            await PrismaDB.sMSToken.deleteMany({
                where: {
                    user: {
                        phone: result.data,
                    },
                },
            });
            // create a new token
            const token = await createToken();
            await PrismaDB.sMSToken.create({
                data: {
                    token: token,
                    user: {
                        connectOrCreate: {
                            where: {
                                phone: result.data,
                            },
                            create: {
                                phone: result.data,
                                username: crypto
                                    .randomBytes(10)
                                    .toString("hex"),
                            },
                        },
                    },
                },
            });
            // send the token to user by twilio
            return { token: true };
        }
    } else {
        // current user puted a token
        const result = tokenSchema.safeParse(token);
        if (!result.success) {
            return {
                token: true,
                error: result.error.flatten(),
            };
        }
        // redirect user to somewhere
        redirect("/");
    }
}
