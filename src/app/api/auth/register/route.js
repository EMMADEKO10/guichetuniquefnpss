import { authService } from '../../../../auth/auth-service.mjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { organizationName, representativeName, email, password } = body;

    if (!organizationName || !representativeName || !email || !password) {
      return Response.json(
        { error: 'Tous les champs obligatoires doivent être renseignés.' },
        { status: 400 }
      );
    }

    const reg = await authService.registerApplicant({
      organizationName,
      representativeName,
      email,
      password
    });

    if (!reg || !reg.success) {
      return Response.json(
        { error: reg?.message || 'Impossible de créer le compte.' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: 'Compte requérant créé avec succès.',
      userId: reg.userId
    }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: 'Erreur interne lors de la création de compte.' },
      { status: 500 }
    );
  }
}

